import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";
import { Loader } from "@mantine/core";

import { toArrayIfNot } from "@jitaspace/utils";

import type { TravelPageProps } from "./page.client";
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

  const initialWaypoints = toArrayIfNot(waypoints ?? [])
    .map((waypoint) => parseWaypoint(waypoint.replaceAll("_", " ")))
    .filter((x) => x !== null) as string[];

  return { solarSystems, initialWaypoints };
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ waypoints?: string[] }>;
}>) {
  const { waypoints } = await params;

  try {
    const { solarSystems, initialWaypoints } = await getTravelData(waypoints);
    return (
      <TravelPage
        initialWaypoints={initialWaypoints}
        solarSystems={solarSystems}
      />
    );
  } catch {
    notFound();
  }
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ waypoints?: string[] }>;
}>) {
  return (
    <Suspense fallback={<Loader />}>
      <PageContent params={params} />
    </Suspense>
  );
}
