import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/react";

import { PageSkeleton } from "~/components/PageSkeleton";
import { pageMetadata, toDescription } from "~/lib/metadata";
import { MISSION_KIND_LABELS, renderMissionText } from "~/lib/missions";
import { parsePositiveEntityId } from "~/lib/routeParams";
import { getMission } from "./data";
import MissionPage from "./page.client";

const BRIEFING_KEY = "messages.mission.briefing";

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ missionId: string }>;
}>): Promise<Metadata> {
  const { missionId: missionIdParam } = await params;
  const missionId = parsePositiveEntityId(missionIdParam);
  if (missionId === null) return {};

  // Uncaught, like the page body: this route is cached whole, so a database
  // failure must throw rather than store generic metadata.
  const mission = await getMission(missionId);
  if (mission === null) return {};
  const briefing = mission.messages.find((m) => m.key === BRIEFING_KEY);
  const issuer =
    mission.issuer.corporation?.name ?? mission.issuer.faction?.name;
  return pageMetadata({
    title: `${mission.name} — Mission`,
    description: toDescription(
      // Placeholders read as their labels ("[Mission Location]") once the
      // markup is stripped.
      briefing
        ? renderMissionText(briefing.text, mission.textValues)
        : undefined,
      `${mission.name}, an EVE Online agent mission — objective, rewards, briefing and dialogue.`,
    ),
    path: `/mission/${missionId}`,
    badge: "Mission",
    facts: [
      { label: "Type", value: MISSION_KIND_LABELS[mission.kind] },
      ...(issuer ? [{ label: "Issuer", value: issuer }] : []),
      ...(mission.epicArcs[0]
        ? [{ label: "Epic Arc", value: mission.epicArcs[0].name }]
        : []),
    ],
  });
}

// ISR per mission: without `generateStaticParams` an unlisted id re-renders on
// every request (see apps/web/CLAUDE.md → "ISR for a dynamic `[param]` route").
// The real ids live in the database, which `next build` cannot reach in CI,
// and Cache Components rejects an empty list — so this lists one id
// `parsePositiveEntityId` refuses, which prerenders as a 404 without a query.
export function generateStaticParams() {
  return [{ missionId: "0" }];
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ missionId: string }>;
}>) {
  const { missionId: missionIdParam } = await params;
  const missionId = parsePositiveEntityId(missionIdParam);
  if (missionId === null) notFound();
  // Uncaught: this page is cached whole, so a database failure must throw
  // rather than store a 404. `null` is a mission that genuinely does not exist.
  const mission = await getMission(missionId);
  if (mission === null) notFound();
  // nuqs's React adapter keeps the cached ISR page complete; see
  // apps/web/CLAUDE.md → "URL-synced filter state".
  return (
    <NuqsAdapter>
      <MissionPage mission={mission} />
    </NuqsAdapter>
  );
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ missionId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
