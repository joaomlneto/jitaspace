import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/react";

import type { EpicArc } from "~/lib/epicArcs";
import { PageSkeleton } from "~/components/PageSkeleton";
import { epicArcSummary } from "~/lib/epicArcs";
import { loadEntityHistory } from "~/lib/history-entity-page";
import { eveImage, pageMetadata } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import { getEpicArc } from "./data";
import EpicArcPage from "./page.client";

/** "X, an EVE Online epic arc for Y: N missions across M agents, with …". */
function describeArc(arc: EpicArc): string {
  const { agentCount, endingCount } = epicArcSummary(arc);
  const agents = agentCount === 1 ? "one agent" : `${agentCount} agents`;
  const endings = endingCount === 1 ? "one ending" : `${endingCount} endings`;
  const issuer = arc.faction?.name ? ` for ${arc.faction.name}` : "";
  return `${arc.name}, an EVE Online epic arc${issuer}: ${arc.steps.length} missions across ${agents}, with ${endings}.`;
}

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ epicArcId: string }>;
}>): Promise<Metadata> {
  const { epicArcId: epicArcIdParam } = await params;
  const epicArcId = parsePositiveEntityId(epicArcIdParam);
  if (epicArcId === null) return {};

  // Uncaught, like the page body: this route is cached whole, so a database
  // failure must throw rather than store generic metadata.
  const arc = await getEpicArc(epicArcId);
  if (arc === null) return {};
  return pageMetadata({
    title: `${arc.name} — Epic Arc`,
    description: describeArc(arc),
    path: `/epic-arc/${epicArcId}`,
    badge: "Epic Arc",
    // Faction logos are served from the corporations path.
    image: arc.faction
      ? eveImage.corporation(arc.faction.factionId)
      : undefined,
    facts: [
      { label: "Missions", value: String(arc.steps.length) },
      ...(arc.faction?.name
        ? [{ label: "Faction", value: arc.faction.name }]
        : []),
    ],
  });
}

// ISR per arc: without `generateStaticParams` an unlisted id re-renders on
// every request (see apps/web/CLAUDE.md → "ISR for a dynamic `[param]` route").
// The real ids live in the database, which `next build` cannot reach in CI,
// and Cache Components rejects an empty list — so this lists one id
// `parsePositiveEntityId` refuses, which prerenders as a 404 without a query.
export function generateStaticParams() {
  return [{ epicArcId: "0" }];
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ epicArcId: string }>;
}>) {
  const { epicArcId: epicArcIdParam } = await params;
  const epicArcId = parsePositiveEntityId(epicArcIdParam);
  if (epicArcId === null) notFound();
  // Uncaught: this page is cached whole, so a database failure must throw
  // rather than store a 404. `null` is an arc that genuinely does not exist.
  const arc = await getEpicArc(epicArcId);
  if (arc === null) notFound();
  const history = await loadEntityHistory("epicArc", epicArcId);
  // nuqs's React adapter keeps the cached ISR page complete; see
  // apps/web/CLAUDE.md → "URL-synced filter state".
  return (
    <NuqsAdapter>
      <EpicArcPage arc={arc} history={history} />
    </NuqsAdapter>
  );
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ epicArcId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
