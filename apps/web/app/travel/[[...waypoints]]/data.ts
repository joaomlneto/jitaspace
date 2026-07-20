import { cacheLife } from "next/cache";

import { toArrayIfNot } from "@jitaspace/utils";

import type { TravelPageProps } from "./page.client";
import { prisma } from "~/lib/db";

// The New Eden solar-system graph is invariant across every /travel/<...> URL,
// so it is fetched and cached ONCE under an argument-free key and shared by all
// of them. Keying this ~1MB+ payload on the catch-all waypoints would spawn a
// separate cache entry per distinct URL — and any entry over the cache store's
// size limit is silently not stored, forcing a full re-query on every request.
export async function getSolarSystems(): Promise<
  TravelPageProps["solarSystems"]
> {
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

// Resolve the catch-all URL segments (system id or name, "_" standing in for a
// space) to known solar-system ids. Kept OUT of the cached fetch above so that
// fetch stays a single shared entry regardless of the requested waypoints.
export function parseInitialWaypoints(
  solarSystems: TravelPageProps["solarSystems"],
  waypoints: string[] | undefined,
): TravelPageProps["initialWaypoints"] {
  const parseWaypoint = (waypoint: string): string | null =>
    Object.entries(solarSystems).find(
      ([solarSystemId, { name }]) =>
        solarSystemId == waypoint ||
        name.toLowerCase() == waypoint.toLowerCase(),
    )?.[0] ?? null;

  return toArrayIfNot(waypoints ?? [])
    .map((waypoint) => parseWaypoint(waypoint.replaceAll("_", " ")))
    .filter((x) => x !== null);
}

// Per-request orchestration: pull the shared (cached) universe graph and resolve
// this URL's waypoints against it. NOT cached itself — only getSolarSystems is —
// so the expensive fetch is never re-keyed on the high-cardinality path.
export async function getTravelPageData(
  waypoints: string[] | undefined,
): Promise<{
  solarSystems: TravelPageProps["solarSystems"];
  initialWaypoints: TravelPageProps["initialWaypoints"];
}> {
  const solarSystems = await getSolarSystems();
  return {
    solarSystems,
    initialWaypoints: parseInitialWaypoints(solarSystems, waypoints),
  };
}
