"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Center, Loader } from "@mantine/core";

import type { HoverKind } from "@jitaspace/solar-system-map";
import { useSolarSystem } from "@jitaspace/hooks";
import { StationName } from "@jitaspace/ui";

import { MoonName, PlanetName, StargateName } from "~/components/Text";

// The map renders a WebGL canvas and pulls in three.js, so it is loaded lazily
// on the client only.
const SolarSystemMap = dynamic(
  () => import("@jitaspace/solar-system-map").then((m) => m.SolarSystemMap),
  {
    ssr: false,
    loading: () => (
      <Center h={460}>
        <Loader size="sm" />
      </Center>
    ),
  },
);

export interface SolarSystem3DProps {
  solarSystemId: number;
  height?: number | string;
}

function renderLabel({ kind, id }: { kind: HoverKind; id: number }) {
  if (kind === "planet") return <PlanetName span planetId={id} />;
  if (kind === "moon") return <MoonName span moonId={id} />;
  if (kind === "station") return <StationName span stationId={id} />;
  return <StargateName span stargateId={id} />;
}

/**
 * Solar-system page adapter around `@jitaspace/solar-system-map`: fetches the
 * system via ESI and supplies name-resolving hover labels.
 */
export function SolarSystem3D({
  solarSystemId,
  height = 460,
}: Readonly<SolarSystem3DProps>) {
  const { data: solarSystem } = useSolarSystem(solarSystemId);
  const data = solarSystem?.data;

  const sceneProps = useMemo(
    () => ({
      planets: (data?.planets ?? []).map((planet) => ({
        planetId: planet.planet_id,
        moonIds: planet.moons ?? [],
        beltIds: planet.asteroid_belts ?? [],
      })),
      stationIds: data?.stations ?? [],
      stargateIds: data?.stargates ?? [],
    }),
    [data],
  );

  if (!data) {
    return (
      <Center h={height}>
        <Loader size="sm" />
      </Center>
    );
  }

  return (
    <SolarSystemMap {...sceneProps} height={height} renderLabel={renderLabel} />
  );
}
