import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/react";

import { PageSkeleton } from "~/components/PageSkeleton";
import { loadEntityHistory } from "~/lib/history-entity-page";
import { pageMetadata, toDescription } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import { readRegion, readRegionIncursions } from "./data";
import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ regionId: string }>;
}): Promise<Metadata> {
  const { regionId } = await params;
  const id = parsePositiveEntityId(regionId);
  if (id === null) return {};

  // Uncaught, like the page body: this route is cached whole, so a database
  // failure must throw rather than store generic metadata. It shares
  // `readRegion` with the page, so both resolve to one cache entry.
  const region = await readRegion(id);
  if (!region) return {};

  const constellations = region.constellations.length;
  const systems = region.systems.length;

  return pageMetadata({
    title: region.name,
    description: toDescription(
      region.description,
      `${region.name} region in EVE Online. Browse its constellations, solar systems, incursions and change history.`,
    ),
    path: `/region/${id}`,
    badge: "Region",
    facts: [
      ...(constellations
        ? [{ label: "Constellations", value: String(constellations) }]
        : []),
      ...(systems ? [{ label: "Systems", value: String(systems) }] : []),
    ],
  });
}

// ISR per region: without `generateStaticParams` an unlisted id re-renders,
// and re-runs every query below, on every request (see apps/web/CLAUDE.md →
// "ISR for a dynamic `[param]` route"). The real ids live in the database,
// which `next build` cannot reach in CI, and Cache Components rejects an empty
// list — so this lists one id `parsePositiveEntityId` refuses, which
// prerenders as a 404 without a query.
export function generateStaticParams() {
  return [{ regionId: "0" }];
}

async function PageContent({
  params,
}: Readonly<{ params: Promise<{ regionId: string }> }>) {
  const { regionId } = await params;
  const id = parsePositiveEntityId(regionId);
  if (id === null) notFound();

  // Uncaught: this page is cached whole, so a database failure must throw
  // rather than store a 404. `null` is a region that genuinely does not exist.
  // The history read runs alongside: a cold one takes seconds, and
  // `loadEntityHistory` never throws.
  const [region, incursions, history] = await Promise.all([
    readRegion(id),
    readRegionIncursions(id),
    loadEntityHistory("region", id),
  ]);
  if (!region) notFound();

  // nuqs's React adapter, not the app-wide Next one: the Next adapter reads
  // `useSearchParams()`, which drops this subtree out of the cached render. The
  // React adapter reads `?tab=` after hydration instead.
  return (
    <NuqsAdapter>
      <PageClient region={region} incursions={incursions} history={history} />
    </NuqsAdapter>
  );
}

export default function Page({
  params,
}: Readonly<{ params: Promise<{ regionId: string }> }>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
