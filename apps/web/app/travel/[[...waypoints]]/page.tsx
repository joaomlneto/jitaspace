import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";

import { toArrayIfNot } from "@jitaspace/utils";

import type { TravelPageProps } from "./page.client";
import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import TravelPage from "./page.client";

async function getTravelData(waypoints: string[] | undefined): Promise<{
  solarSystems: TravelPageProps["solarSystems"];
  initialWaypoints: TravelPageProps["initialWaypoints"];
}> {
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

  const parseWaypoint = (waypoint: string): string | null => {
    return (
      Object.entries(solarSystems).find(
        ([solarSystemId, { name }]) =>
          solarSystemId == waypoint ||
          name.toLowerCase() == waypoint.toLowerCase(),
      )?.[0] ?? null
    );
  };

  const initialWaypoints = toArrayIfNot(waypoints ?? [])
    .map((waypoint) => parseWaypoint(waypoint.replaceAll("_", " ")))
    .filter((x) => x !== null);

  return { solarSystems, initialWaypoints };
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ waypoints?: string[] }>;
}>) {
  const { waypoints } = await params;

  let travelData: Awaited<ReturnType<typeof getTravelData>>;
  try {
    travelData = await getTravelData(waypoints);
  } catch {
    notFound();
  }
  return (
    <TravelPage
      initialWaypoints={travelData.initialWaypoints}
      solarSystems={travelData.solarSystems}
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
