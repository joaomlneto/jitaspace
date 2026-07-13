import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";

import { toArrayIfNot } from "@jitaspace/utils";

import type { TravelPageProps } from "./page.client";
import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import TravelPage from "./page.client";

// The New Eden solar-system graph is invariant across every /travel/<...> URL,
// so it is fetched and cached ONCE under an argument-free key and shared by all
// of them. Keying this ~1MB+ payload on the catch-all waypoints would spawn a
// separate cache entry per distinct URL — and any entry over the cache store's
// size limit is silently not stored, forcing a full re-query on every request.
async function getSolarSystems(): Promise<TravelPageProps["solarSystems"]> {
  "use cache";
  cacheLife("days");

  const solarSystems: TravelPageProps["solarSystems"] = {};

  const solarSystemsQuery = await prisma.solarSystem.findMany({
    select: {
      solarSystemId: true,
      name: true,
      securityStatus: true,
      stargates: {
        select: {
          DestinationStargate: {
            select: {
              solarSystemId: true,
            },
          },
        },
      },
    },
  });

  solarSystemsQuery.forEach((solarSystem) => {
    solarSystems[solarSystem.solarSystemId] = {
      name: solarSystem.name,
      securityStatus: solarSystem.securityStatus.toNumber(),
      neighbors: solarSystem.stargates.flatMap((stargate) =>
        stargate.DestinationStargate
          ? [stargate.DestinationStargate.solarSystemId]
          : [],
      ),
    };
  });

  return solarSystems;
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ waypoints?: string[] }>;
}>) {
  const { waypoints } = await params;

  let solarSystems: TravelPageProps["solarSystems"];
  try {
    solarSystems = await getSolarSystems();
  } catch {
    notFound();
  }

  // Cheap, request-specific parsing lives OUTSIDE the cache so the expensive
  // universe fetch above stays a single shared cache entry.
  const parseWaypoint = (waypoint: string): string | null =>
    Object.entries(solarSystems).find(
      ([solarSystemId, { name }]) =>
        solarSystemId == waypoint ||
        name.toLowerCase() == waypoint.toLowerCase(),
    )?.[0] ?? null;

  const initialWaypoints = toArrayIfNot(waypoints ?? [])
    .map((waypoint) => parseWaypoint(waypoint.replaceAll("_", " ")))
    .filter((x) => x !== null);

  return (
    <TravelPage
      initialWaypoints={initialWaypoints}
      solarSystems={solarSystems}
    />
  );
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ waypoints?: string[] }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
