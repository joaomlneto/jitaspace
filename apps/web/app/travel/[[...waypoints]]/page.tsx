import { notFound } from "next/navigation";

import { prisma } from "@jitaspace/db";
import { toArrayIfNot } from "@jitaspace/utils";

import TravelPage from "./page.client";
import type { TravelPageProps } from "./page.client";

export const revalidate = 86400;

export default async function Page({
  params,
}: {
  params: Promise<{ waypoints?: string[] }>;
}) {
  const { waypoints } = await params;
  let solarSystems: TravelPageProps["solarSystems"] = {};
  let initialWaypoints: TravelPageProps["initialWaypoints"] = [];

  try {
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
        neighbors: solarSystem.stargates.flatMap(
          (stargate) => stargate.DestinationStargate!.solarSystemId,
        ),
      };
    });

    const parseWaypoint = (waypoint: string): string | null => {
      return (
        Object.entries(solarSystems).find(
          ([solarSystemId, { name }]) =>
            solarSystemId == waypoint ||
            name.toLowerCase() == waypoint?.toLowerCase(),
        )?.[0] ?? null
      );
    };

    initialWaypoints = toArrayIfNot(waypoints ?? [])
      .map((waypoint) => parseWaypoint(waypoint.replaceAll("_", " ")))
      .filter((x) => x !== null) as string[];
  } catch {
    notFound();
  }

  return (
    <TravelPage
      initialWaypoints={initialWaypoints}
      solarSystems={solarSystems}
    />
  );
}
