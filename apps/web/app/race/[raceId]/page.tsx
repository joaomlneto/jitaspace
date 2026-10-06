import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/react";

import { PageSkeleton } from "~/components/PageSkeleton";
import { loadEntityHistory } from "~/lib/history-entity-page";
import { pageMetadata, resolveTypeImage, toDescription } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import { readRaceData, readRaceMetadata } from "./data";
import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ raceId: string }>;
}): Promise<Metadata> {
  const { raceId } = await params;
  const id = parsePositiveEntityId(raceId);
  if (id === null) return {};

  // Uncaught, like the page body: this route is cached whole, so a database
  // failure must throw rather than store generic metadata.
  const race = await readRaceMetadata(id);
  if (!race) return {};

  return pageMetadata({
    title: race.name,
    description: toDescription(
      race.description,
      `The ${race.name} race in EVE Online — its bloodlines, ships, and place in New Eden.`,
    ),
    path: `/race/${id}`,
    badge: "Race",
    // The race's starter hull is the closest thing a race has to a portrait.
    image: race.shipTypeId
      ? await resolveTypeImage(race.shipTypeId)
      : undefined,
    facts: [
      ...(race.faction ? [{ label: "Faction", value: race.faction.name }] : []),
      ...(race._count.bloodlines > 0
        ? [{ label: "Bloodlines", value: String(race._count.bloodlines) }]
        : []),
    ],
  });
}

// ISR per race: without `generateStaticParams` an unlisted id re-renders, and
// re-runs every query below, on every request (see apps/web/CLAUDE.md → "ISR
// for a dynamic `[param]` route"). The real ids live in the database, which
// `next build` cannot reach in CI, and Cache Components rejects an empty list
// — so this lists one id `parsePositiveEntityId` refuses, which prerenders as a
// 404 without a query. The page then revalidates daily, with its data.
export function generateStaticParams() {
  return [{ raceId: "0" }];
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ raceId: string }>;
}>) {
  const { raceId } = await params;
  const id = parsePositiveEntityId(raceId);
  if (id === null) notFound();
  // Uncaught: this page is cached whole, so a database failure must throw
  // rather than store a 404. `null` is a race that genuinely does not exist.
  const race = await readRaceData(id);
  if (!race) notFound();
  const history = await loadEntityHistory("race", id);
  // nuqs's React adapter, not the app-wide Next one: the Next adapter reads
  // `useSearchParams()`, which drops this subtree out of the cached render. The
  // React adapter reads `?tab=` after hydration instead.
  return (
    <NuqsAdapter>
      <PageClient {...race} history={history} />
    </NuqsAdapter>
  );
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ raceId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
