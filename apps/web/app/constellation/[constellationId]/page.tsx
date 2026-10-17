import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/react";

import { PageSkeleton } from "~/components/PageSkeleton";
import { loadEntityHistory } from "~/lib/history-entity-page";
import { pageMetadata, withArticle } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import { readConstellation, readConstellationIncursions } from "./data";
import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ constellationId: string }>;
}): Promise<Metadata> {
  const { constellationId } = await params;
  const id = parsePositiveEntityId(constellationId);
  if (id === null) return {};

  // Uncaught, like the page body: this route is cached whole, so a database
  // failure must throw rather than store generic metadata. It shares
  // `readConstellation` with the page, so both resolve to one cache entry.
  const constellation = await readConstellation(id);
  if (!constellation) return {};

  const region = constellation.region?.name;
  const systems = constellation.systems.length;
  const inRegion = region ? ` in ${withArticle(region)} region` : "";
  const spanning = systems ? `, spanning ${systems} solar systems` : "";

  return pageMetadata({
    title: constellation.name,
    description: `${constellation.name} is a constellation${inRegion} of EVE Online${spanning}. See its systems, neighbouring constellations, incursions and change history.`,
    path: `/constellation/${id}`,
    badge: "Constellation",
    facts: [
      ...(region ? [{ label: "Region", value: region }] : []),
      ...(systems ? [{ label: "Systems", value: String(systems) }] : []),
    ],
  });
}

// ISR per constellation: without `generateStaticParams` an unlisted id
// re-renders, and re-runs every query below, on every request (see
// apps/web/CLAUDE.md → "ISR for a dynamic `[param]` route"). The real ids live
// in the database, which `next build` cannot reach in CI, and Cache Components
// rejects an empty list — so this lists one id `parsePositiveEntityId` refuses,
// which prerenders as a 404 without a query.
export function generateStaticParams() {
  return [{ constellationId: "0" }];
}

async function PageContent({
  params,
}: Readonly<{ params: Promise<{ constellationId: string }> }>) {
  const { constellationId } = await params;
  const id = parsePositiveEntityId(constellationId);
  if (id === null) notFound();

  // Uncaught: this page is cached whole, so a database failure must throw
  // rather than store a 404. `null` is a constellation that genuinely does not
  // exist. The history read runs alongside: a cold one takes seconds, and
  // `loadEntityHistory` never throws.
  const [constellation, incursions, history] = await Promise.all([
    readConstellation(id),
    readConstellationIncursions(id),
    loadEntityHistory("constellation", id),
  ]);
  if (!constellation) notFound();

  // nuqs's React adapter, not the app-wide Next one: the Next adapter reads
  // `useSearchParams()`, which drops this subtree out of the cached render. The
  // React adapter reads `?tab=` after hydration instead.
  return (
    <NuqsAdapter>
      <PageClient
        constellation={constellation}
        incursions={incursions}
        history={history}
      />
    </NuqsAdapter>
  );
}

export default function Page({
  params,
}: Readonly<{ params: Promise<{ constellationId: string }> }>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
