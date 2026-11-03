import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/react";

import { PageSkeleton } from "~/components/PageSkeleton";
import { loadEntityHistory } from "~/lib/history-entity-page";
import { eveImage, pageMetadata, toDescription } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import {
  readFactionLiveData,
  readFactionMetadata,
  readFactionSdeData,
  splitFactionData,
} from "./data";
import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ factionId: string }>;
}): Promise<Metadata> {
  const { factionId } = await params;
  const id = parsePositiveEntityId(factionId);
  if (id === null) return {};

  // Uncaught, like the page body: this route is cached whole, so a database
  // failure must throw rather than store generic metadata.
  const faction = await readFactionMetadata(id);
  if (!faction) return {};

  return pageMetadata({
    title: faction.name,
    description: toDescription(
      faction.description,
      `${faction.name} in EVE Online.`,
    ),
    path: `/faction/${id}`,
    badge: "Faction",
    // Factions have no artwork of their own on the image CDN; their holding
    // corporation's logo is the emblem players recognise.
    image: faction.corporationId
      ? eveImage.corporation(faction.corporationId)
      : undefined,
    facts: [
      ...(faction.stationCount
        ? [{ label: "Stations", value: String(faction.stationCount) }]
        : []),
      ...(faction.militiaCorporation
        ? [{ label: "Militia", value: faction.militiaCorporation.name }]
        : []),
    ],
  });
}

// ISR per faction: without `generateStaticParams` an unlisted id re-renders,
// and re-runs every query below, on every request (see apps/web/CLAUDE.md →
// "ISR for a dynamic `[param]` route"). The real ids live in the database,
// which `next build` cannot reach in CI, and Cache Components rejects an empty
// list — so this lists one id `parsePositiveEntityId` refuses, which
// prerenders as a 404 without a query. The page then revalidates on its
// shortest read, the hourly live data.
export function generateStaticParams() {
  return [{ factionId: "0" }];
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ factionId: string }>;
}>) {
  const { factionId } = await params;
  const id = parsePositiveEntityId(factionId);
  if (id === null) notFound();
  // Uncaught: this page is cached whole, so a database failure must throw
  // rather than store a 404 or an empty half. `null` is a faction that
  // genuinely does not exist.
  const sde = await readFactionSdeData(id);
  if (!sde) notFound();
  const live = await readFactionLiveData(
    id,
    sde.militiaCorporation?.id ?? null,
  );
  // The table rows stay out of the page; the tabs fetch them when opened.
  const { page } = splitFactionData(sde, live);
  const history = await loadEntityHistory("faction", id);
  // nuqs's React adapter, not the app-wide Next one: the Next adapter reads
  // `useSearchParams()`, which drops this subtree out of the cached render. The
  // React adapter reads `?tab=` after hydration instead.
  return (
    <NuqsAdapter>
      <PageClient {...page} history={history} />
    </NuqsAdapter>
  );
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ factionId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
