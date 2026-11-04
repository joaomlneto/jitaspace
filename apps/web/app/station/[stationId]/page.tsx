import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/react";

import { PageSkeleton } from "~/components/PageSkeleton";
import { formatCountOf } from "~/lib/format";
import { loadEntityHistory } from "~/lib/history-entity-page";
import { pageMetadata, resolveTypeImage } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import { readStation } from "./data";
import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stationId: string }>;
}): Promise<Metadata> {
  const { stationId } = await params;
  const id = parsePositiveEntityId(stationId);
  if (id === null) return {};

  // Uncaught, like the page body: this route is cached whole, so a database
  // failure must throw rather than store generic metadata.
  const station = await readStation(id);
  if (!station) return {};

  const system = station.location?.solarSystem.name;
  const region = station.location?.region?.name;
  const owner = station.owner?.name;

  const inSystem = system ? ` in ${system}` : "";
  const operatedBy = owner ? `, operated by ${owner}` : "";
  const agents =
    station.agents.length > 0
      ? `, ${formatCountOf(station.agents.length, "agent", "agents")}`
      : "";

  return pageMetadata({
    title: station.name,
    description: `${station.name} is an NPC station${inSystem}${operatedBy}. See its services${agents}, facilities and change history.`,
    path: `/station/${id}`,
    badge: "Station",
    image: await resolveTypeImage(station.type.id),
    facts: [
      ...(system ? [{ label: "System", value: system }] : []),
      ...(region ? [{ label: "Region", value: region }] : []),
      ...(owner ? [{ label: "Owner", value: owner }] : []),
    ],
  });
}

// ISR per station: without `generateStaticParams` an unlisted id re-renders,
// and re-runs every query below, on every request (see apps/web/CLAUDE.md →
// "ISR for a dynamic `[param]` route"). The real ids live in the database,
// which `next build` cannot reach in CI, and Cache Components rejects an empty
// list — so this lists one id `parsePositiveEntityId` refuses, which
// prerenders as a 404 without a query.
export function generateStaticParams() {
  return [{ stationId: "0" }];
}

async function PageContent({
  params,
}: Readonly<{ params: Promise<{ stationId: string }> }>) {
  const { stationId } = await params;
  const id = parsePositiveEntityId(stationId);
  if (id === null) notFound();

  // Uncaught: this page is cached whole, so a database failure must throw
  // rather than store a 404. `null` is a station that genuinely does not exist.
  // The history read runs alongside, not after: a cold one takes seconds, and
  // `loadEntityHistory` never throws.
  const [station, history] = await Promise.all([
    readStation(id),
    loadEntityHistory("npcStation", id),
  ]);
  if (!station) notFound();

  // nuqs's React adapter, not the app-wide Next one: the Next adapter reads
  // `useSearchParams()`, which drops this subtree out of the cached render. The
  // React adapter reads `?tab=` after hydration instead.
  return (
    <NuqsAdapter>
      <PageClient station={station} history={history} />
    </NuqsAdapter>
  );
}

export default function Page({
  params,
}: Readonly<{ params: Promise<{ stationId: string }> }>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
