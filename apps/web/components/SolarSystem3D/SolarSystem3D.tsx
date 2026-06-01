"use client";

import dynamic from "next/dynamic";
import { Center, Loader } from "@mantine/core";
import { useQueries } from "@tanstack/react-query";

import type {
  BodyInput,
  HoverKind,
  PlanetInput,
  Vec3,
} from "@jitaspace/solar-system-map";
import { useSolarSystem } from "@jitaspace/hooks";
import {
  getPlanetByIdQueryOptions,
  getStargateByIdQueryOptions,
  getStationByIdQueryOptions,
} from "@jitaspace/sde-client";
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

interface SdePosition {
  x?: number;
  y?: number;
  z?: number;
}

function toVec(position: SdePosition | undefined): Vec3 {
  return [position?.x ?? 0, position?.y ?? 0, position?.z ?? 0];
}

function renderLabel({ kind, id }: { kind: HoverKind; id: number }) {
  if (kind === "planet") return <PlanetName span planetId={id} />;
  if (kind === "moon") return <MoonName span moonId={id} />;
  if (kind === "station") return <StationName span stationId={id} />;
  return <StargateName span stargateId={id} />;
}

/**
 * Solar-system page adapter around `@jitaspace/solar-system-map`: resolves the
 * system's celestials, fetches their real positions from the SDE, and supplies
 * name-resolving hover labels.
 */
export function SolarSystem3D({
  solarSystemId,
  height = 460,
}: Readonly<SolarSystem3DProps>) {
  const { data: solarSystem } = useSolarSystem(solarSystemId);
  const data = solarSystem?.data;

  const planetEntries = data?.planets ?? [];
  const stationIds = data?.stations ?? [];
  const stargateIds = data?.stargates ?? [];

  const planetQueries = useQueries({
    queries: planetEntries.map((planet) =>
      getPlanetByIdQueryOptions(planet.planet_id),
    ),
  });
  const stationQueries = useQueries({
    queries: stationIds.map((id) => getStationByIdQueryOptions(id)),
  });
  const stargateQueries = useQueries({
    queries: stargateIds.map((id) => getStargateByIdQueryOptions(id)),
  });

  const planets: PlanetInput[] = planetEntries
    .map((planet, i) => {
      const position = planetQueries[i]?.data?.data.position;
      if (!position) return undefined;
      return {
        id: planet.planet_id,
        position: toVec(position),
        moonIds: planet.moons ?? [],
      };
    })
    .filter((p): p is PlanetInput => p !== undefined);

  const stations: BodyInput[] = stationIds
    .map((id, i) => {
      const position = stationQueries[i]?.data?.data.position;
      return position ? { id, position: toVec(position) } : undefined;
    })
    .filter((s): s is BodyInput => s !== undefined);

  const stargates: BodyInput[] = stargateIds
    .map((id, i) => {
      const position = stargateQueries[i]?.data?.data.position;
      return position ? { id, position: toVec(position) } : undefined;
    })
    .filter((s): s is BodyInput => s !== undefined);

  const settled =
    !!data &&
    planetQueries.every((q) => !q.isLoading) &&
    stationQueries.every((q) => !q.isLoading) &&
    stargateQueries.every((q) => !q.isLoading);

  if (!settled) {
    return (
      <Center h={height}>
        <Loader size="sm" />
      </Center>
    );
  }

  return (
    <SolarSystemMap
      planets={planets}
      stations={stations}
      stargates={stargates}
      height={height}
      renderLabel={renderLabel}
    />
  );
}
