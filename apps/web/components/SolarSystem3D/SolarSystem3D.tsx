"use client";

import { useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { Center, Loader, Text } from "@mantine/core";
import { useQueries, useQuery } from "@tanstack/react-query";

import type {
  BodyInput,
  HoverKind,
  PlanetInput,
  StarInput,
  Vec3,
} from "@jitaspace/solar-system-map";
import {
  getUniverseMoonsMoonIdQueryOptions,
  getUniversePlanetsPlanetIdQueryOptions,
  getUniverseStargatesStargateIdQueryOptions,
  getUniverseStarsStarIdQueryOptions,
  getUniverseStationsStationIdQueryOptions,
} from "@jitaspace/esi-client";
import { StationName } from "@jitaspace/eve-components";
import { useSolarSystem } from "@jitaspace/hooks";

import {
  MoonName,
  PlanetName,
  StargateName,
  StarName,
} from "~/components/Text";

// The map renders a WebGL canvas and pulls in three.js, so it is loaded lazily
// on the client only. This fallback lives at module scope and so cannot see the
// `height` prop; it fills the wrapper element rendered below instead, which is
// what carries the caller's height. That keeps the chunk-loading fallback,
// the pre-settle loader and the settled map all exactly the same height.
const SolarSystemMap = dynamic(
  () => import("@jitaspace/solar-system-map").then((m) => m.SolarSystemMap),
  {
    ssr: false,
    loading: () => (
      <Center h="100%">
        <Loader size="sm" />
      </Center>
    ),
  },
);

export interface SolarSystem3DProps {
  solarSystemId: number;
  height?: number | string;
}

interface EsiPosition {
  x?: number;
  y?: number;
  z?: number;
}

/**
 * `StarInput.id` is required by the map's public API, so a system with no
 * `star_id` (e.g. some abyssal systems) is handed this sentinel. No real ESI id
 * is 0, so `renderLabel` uses it to skip the name lookup for a star that does
 * not exist rather than requesting id 0 from ESI.
 */
const NO_STAR_ID = 0;

function toVec(position: EsiPosition | undefined): Vec3 {
  return [position?.x ?? 0, position?.y ?? 0, position?.z ?? 0];
}

function renderLabel({ kind, id }: { kind: HoverKind; id: number }) {
  if (kind === "star") {
    if (id === NO_STAR_ID) return <Text span>Star</Text>;
    return <StarName span starId={id} />;
  }
  if (kind === "planet") return <PlanetName span planetId={id} />;
  if (kind === "moon") return <MoonName span moonId={id} />;
  if (kind === "station") return <StationName span stationId={id} />;
  return <StargateName span stargateId={id} />;
}

/**
 * Projects a `useQueries` fan-out down to the ESI payloads plus a single
 * loading flag.
 *
 * `useQueries` hands back a brand-new array of brand-new result objects on
 * every render, so anything derived from it inline can never be memoised.
 * Passing the projection as `combine` instead makes React Query own it: it only
 * re-runs when the underlying results actually change and structurally shares
 * the output, so `bodies` keeps its identity across re-renders for as long as
 * the resolved data is unchanged. That is what lets the `useMemo`s below (and,
 * through them, the scene's own `layoutSystem` memo) actually hold. Declared at
 * module scope so the `combine` reference is stable too.
 */
function combineEsiQueries<TBody>(
  results: readonly { data?: { data: TBody }; isLoading: boolean }[],
) {
  return {
    bodies: results.map((result) => result.data?.data),
    isLoading: results.some((result) => result.isLoading),
  };
}

/**
 * Solar-system page adapter around `@jitaspace/solar-system-map`: resolves the
 * system's celestials, fetches their real positions (and the star's radius)
 * from ESI's universe endpoints, and supplies name-resolving hover labels.
 * ESI doesn't expose planet/moon radii, so those bodies fall back to a uniform
 * size — the map's spatial layout is unaffected.
 */
export function SolarSystem3D({
  solarSystemId,
  height = 460,
}: Readonly<SolarSystem3DProps>) {
  const { data: solarSystem, isError: systemError } =
    useSolarSystem(solarSystemId);
  const data = solarSystem?.data;

  // Kick off the WebGL/three.js chunk download on mount so it overlaps the ESI
  // queries below instead of only starting after they all resolve: next/dynamic
  // only starts loading once <SolarSystemMap> renders, which is gated behind
  // `settled`. Swallow failures — next/dynamic reports them again through its
  // own loader, and an unhandled rejection here would just be noise in Sentry.
  useEffect(() => {
    void import("@jitaspace/solar-system-map").catch(() => undefined);
  }, []);

  const starId = data?.star_id;
  const planetEntries = useMemo(() => data?.planets ?? [], [data]);
  const stationIds = useMemo(() => data?.stations ?? [], [data]);
  const stargateIds = useMemo(() => data?.stargates ?? [], [data]);

  const moonIds = useMemo(
    () => planetEntries.flatMap((planet) => planet.moons ?? []),
    [planetEntries],
  );

  // ESI universe data is immutable, so these never go stale (staleTime: Infinity);
  // without it the app-wide QueryClient defaults (staleTime 0 +
  // refetchOnWindowFocus) re-fire the whole fan-out — ~60 requests for a system
  // like Jita — every time the user tabs back. `retry: 1` keeps the all-or-
  // nothing loading gate below in check: `settled` waits on every query, so a
  // single flaky request would otherwise hold the whole map behind the default
  // 3-retry backoff (~7s) rather than ~2s.
  const starQuery = useQuery({
    ...getUniverseStarsStarIdQueryOptions(starId ?? NO_STAR_ID),
    enabled: starId !== undefined,
    staleTime: Infinity,
    retry: 1,
  });
  const { bodies: planetBodies, isLoading: planetsLoading } = useQueries({
    queries: planetEntries.map((planet) => ({
      ...getUniversePlanetsPlanetIdQueryOptions(planet.planet_id),
      staleTime: Infinity,
      retry: 1,
    })),
    combine: combineEsiQueries,
  });
  const { bodies: moonBodies, isLoading: moonsLoading } = useQueries({
    queries: moonIds.map((id) => ({
      ...getUniverseMoonsMoonIdQueryOptions(id),
      staleTime: Infinity,
      retry: 1,
    })),
    combine: combineEsiQueries,
  });
  const { bodies: stationBodies, isLoading: stationsLoading } = useQueries({
    queries: stationIds.map((id) => ({
      ...getUniverseStationsStationIdQueryOptions(id),
      staleTime: Infinity,
      retry: 1,
    })),
    combine: combineEsiQueries,
  });
  const { bodies: stargateBodies, isLoading: stargatesLoading } = useQueries({
    queries: stargateIds.map((id) => ({
      ...getUniverseStargatesStargateIdQueryOptions(id),
      staleTime: Infinity,
      retry: 1,
    })),
    combine: combineEsiQueries,
  });

  const moonById = useMemo(() => {
    const byId = new Map<number, BodyInput>();
    moonIds.forEach((id, index) => {
      const moon = moonBodies[index];
      if (moon?.position) {
        byId.set(id, {
          id,
          position: toVec(moon.position),
        });
      }
    });
    return byId;
  }, [moonIds, moonBodies]);

  const starRadius = starQuery.data?.data.radius;
  const star = useMemo<StarInput>(
    () => ({ id: starId ?? NO_STAR_ID, radius: starRadius ?? 0 }),
    [starId, starRadius],
  );

  const planets = useMemo<PlanetInput[]>(
    () =>
      planetEntries
        .map((planet, index) => {
          const body = planetBodies[index];
          if (!body?.position) return undefined;
          const moons: BodyInput[] = (planet.moons ?? [])
            .map((id) => moonById.get(id))
            .filter((m): m is BodyInput => m !== undefined);
          return {
            id: planet.planet_id,
            position: toVec(body.position),
            moons,
          };
        })
        .filter((p): p is PlanetInput => p !== undefined),
    [planetEntries, planetBodies, moonById],
  );

  const stations = useMemo<BodyInput[]>(
    () =>
      stationIds
        .map((id, index) => {
          const position = stationBodies[index]?.position;
          return position ? { id, position: toVec(position) } : undefined;
        })
        .filter((s): s is BodyInput => s !== undefined),
    [stationIds, stationBodies],
  );

  const stargates = useMemo<BodyInput[]>(
    () =>
      stargateIds
        .map((id, index) => {
          const position = stargateBodies[index]?.position;
          return position ? { id, position: toVec(position) } : undefined;
        })
        .filter((s): s is BodyInput => s !== undefined),
    [stargateIds, stargateBodies],
  );

  // The star query is disabled when the system has no star_id (e.g. some abyssal
  // systems), so `settled` must NOT block on it — it stays not-loading and the
  // map still renders. The resulting radius of 0 draws the star at the overview
  // modes' constant size, but collapses to the package's minimum geometry (1e-4,
  // i.e. effectively invisible) in realistic mode. Failed per-body queries
  // resolve to not-loading too, so a partial failure degrades to a partial map
  // rather than hanging.
  const settled =
    !!data &&
    !starQuery.isLoading &&
    !planetsLoading &&
    !moonsLoading &&
    !stationsLoading &&
    !stargatesLoading;

  if (systemError) {
    return (
      <Center h={height}>
        <Text size="sm" c="dimmed">
          System map is unavailable right now.
        </Text>
      </Center>
    );
  }

  if (!settled) {
    return (
      <Center h={height}>
        <Loader size="sm" />
      </Center>
    );
  }

  return (
    <div style={{ height }}>
      {/*
        `describeContents` is left on (its default): the hidden text alternative
        makes the map readable to assistive tech. It resolves every body through
        `renderLabel`, which for moons means an eager ESI name fetch per moon on
        open — planets/stations/gates dedupe against the page's listings, moons
        don't. That request cost is a deliberate a11y-over-requests trade; pass
        `describeContents={false}` to fall back to the page's own body lists.
      */}
      <SolarSystemMap
        star={star}
        planets={planets}
        stations={stations}
        stargates={stargates}
        height="100%"
        renderLabel={renderLabel}
      />
    </div>
  );
}
