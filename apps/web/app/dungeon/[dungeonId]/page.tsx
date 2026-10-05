import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/react";

import { PageSkeleton } from "~/components/PageSkeleton";
import { pageMetadata, toDescription } from "~/lib/metadata";
import { dungeonDisplayName } from "~/lib/missions";
import { parsePositiveEntityId } from "~/lib/routeParams";
import { getDungeon } from "./data";
import DungeonPage from "./page.client";

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ dungeonId: string }>;
}>): Promise<Metadata> {
  const { dungeonId: dungeonIdParam } = await params;
  const dungeonId = parsePositiveEntityId(dungeonIdParam);
  if (dungeonId === null) return {};

  // Uncaught, like the page body: this route is cached whole, so a database
  // failure must throw rather than store generic metadata.
  const dungeon = await getDungeon(dungeonId);
  if (dungeon === null) return {};
  const name = dungeonDisplayName(dungeon);
  const text = dungeon.description ?? dungeon.gameplayDescription;
  return pageMetadata({
    title: `${name} — Dungeon`,
    description: toDescription(
      text ?? undefined,
      dungeon.described
        ? `${name}, an EVE Online ${dungeon.archetype?.title?.toLowerCase() ?? "site"} — description, ship restrictions and the missions that use it.`
        : `EVE Online dungeon ${dungeonId} — the ${dungeon.missions.length === 1 ? "mission" : "missions"} and agents that use it.`,
    ),
    path: `/dungeon/${dungeonId}`,
    badge: "Dungeon",
    facts: [
      ...(dungeon.archetype?.title
        ? [{ label: "Archetype", value: dungeon.archetype.title }]
        : []),
      ...(dungeon.faction?.name
        ? [{ label: "Faction", value: dungeon.faction.name }]
        : []),
      ...(dungeon.missions.length > 0
        ? [{ label: "Missions", value: String(dungeon.missions.length) }]
        : []),
    ],
  });
}

// ISR per dungeon: without `generateStaticParams` an unlisted id re-renders on
// every request (see apps/web/CLAUDE.md → "ISR for a dynamic `[param]` route").
// The real ids live in the database, which `next build` cannot reach in CI,
// and Cache Components rejects an empty list — so this lists one id
// `parsePositiveEntityId` refuses, which prerenders as a 404 without a query.
export function generateStaticParams() {
  return [{ dungeonId: "0" }];
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ dungeonId: string }>;
}>) {
  const { dungeonId: dungeonIdParam } = await params;
  const dungeonId = parsePositiveEntityId(dungeonIdParam);
  if (dungeonId === null) notFound();
  // Uncaught: this page is cached whole, so a database failure must throw
  // rather than store a 404. `null` is a dungeon nothing in the SDE knows.
  const dungeon = await getDungeon(dungeonId);
  if (dungeon === null) notFound();
  // nuqs's React adapter keeps the cached ISR page complete; see
  // apps/web/CLAUDE.md → "URL-synced filter state".
  return (
    <NuqsAdapter>
      <DungeonPage dungeon={dungeon} />
    </NuqsAdapter>
  );
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ dungeonId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
