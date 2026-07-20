"use client";

import dynamic from "next/dynamic";
import { Center, Loader } from "@mantine/core";
import { useQueries, useQuery } from "@tanstack/react-query";

import type {
  BodyInput,
  HoverKind,
  PlanetInput,
  StarInput,
  Vec3,
} from "@jitaspace/solar-system-map";
import { StationName } from "@jitaspace/eve-components";
import { useSolarSystem } from "@jitaspace/hooks";
import {
  getMoonByIdQueryOptions,
  getPlanetByIdQueryOptions,
  getStarByIdQueryOptions,
  getStargateByIdQueryOptions,
  getStationByIdQueryOptions,
} from "@jitaspace/sde-client";

import {
  MoonName,
  PlanetName,
  StargateName,
  StarName,
} from "~/components/Text";

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
  if (kind === "star") return <StarName span starId={id} />;
  if (kind === "planet") return <PlanetName span planetId={id} />;
  if (kind === "moon") return <MoonName span moonId={id} />;
  if (kind === "station") return <StationName span stationId={id} />;
  return <StargateName span stargateId={id} />;
}

/**
 * Solar-system page adapter around `@jitaspace/solar-system-map`: resolves the
 * system's celestials, fetches their real positions and radii from the SDE, and
 * supplies name-resolving hover labels.
 */
export function SolarSystem3D({
  solarSystemId,
  height = 460,
}: Readonly<SolarSystem3DProps>) {
  const { data: solarSystem } = useSolarSystem(solarSystemId);
  const data = solarSystem?.data;

  const starId = data?.star_id;
  const planetEntries = data?.planets ?? [];
  const stationIds = data?.stations ?? [];
  const stargateIds = data?.stargates ?? [];

  const moonIds = planetEntries.flatMap((planet) => planet.moons ?? []);

  const starQuery = useQuery({
    ...getStarByIdQueryOptions(starId ?? 0),
    enabled: starId !== undefined,
  });
  const planetQueries = useQueries({
    queries: planetEntries.map((planet) =>
      getPlanetByIdQueryOptions(planet.planet_id),
    ),
  });
  const moonQueries = useQueries({
    queries: moonIds.map((id) => getMoonByIdQueryOptions(id)),
  });
  const stationQueries = useQueries({
    queries: stationIds.map((id) => getStationByIdQueryOptions(id)),
  });
  const stargateQueries = useQueries({
    queries: stargateIds.map((id) => getStargateByIdQueryOptions(id)),
  });

  const moonById = new Map<number, BodyInput>();
  moonIds.forEach((id, i) => {
    const moon = moonQueries[i]?.data?.data;
    if (moon?.position) {
      moonById.set(id, {
        id,
        position: toVec(moon.position),
        radius: moon.radius,
      });
    }
  });

  const star: StarInput = {
    id: starId ?? 0,
    radius: starQuery.data?.data.radius ?? 0,
  };

  const planets: PlanetInput[] = planetEntries
    .map((planet, i) => {
      const sde = planetQueries[i]?.data?.data;
      if (!sde?.position) return undefined;
      const moons: BodyInput[] = (planet.moons ?? [])
        .map((id) => moonById.get(id))
        .filter((m): m is BodyInput => m !== undefined);
      return {
        id: planet.planet_id,
        position: toVec(sde.position),
        radius: sde.radius,
        moons,
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
    starId !== undefined &&
    !starQuery.isLoading &&
    planetQueries.every((q) => !q.isLoading) &&
    moonQueries.every((q) => !q.isLoading) &&
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
      star={star}
      planets={planets}
      stations={stations}
      stargates={stargates}
      height={height}
      renderLabel={renderLabel}
    />
  );
}
