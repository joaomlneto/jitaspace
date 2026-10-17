import { cacheLife, cacheTag } from "next/cache";

import type {
  ConstellationIncursions,
  ConstellationPageData,
  NeighbouringConstellation,
} from "./types";
import { incursionSiteRole } from "~/app/incursions/siteRoles";
import { prisma } from "~/lib/db";
import { cacheSdeRead, SDE_CACHE_TAG } from "~/lib/sdeCache";

/**
 * A constellation, its systems and the constellations its stargates lead to.
 * Returns null for an unknown id, which the page turns into a 404.
 *
 * SDE data only, so it is cached until the next SDE ingest. A failed query
 * throws rather than returning null: a database blip must never be mistaken
 * for a missing constellation and cached as a 404 (see "Never catch a database
 * error inside a `"use cache"` scope" in CLAUDE.md). That is also why this
 * reads with `findUnique` and tests for null.
 */
export async function readConstellation(
  constellationId: number,
): Promise<ConstellationPageData | null> {
  "use cache";
  cacheSdeRead();

  const constellation = await prisma.constellation.findUnique({
    select: {
      name: true,
      regionId: true,
      region: { select: { name: true } },
      factionId: true,
      wormholeClassId: true,
    },
    where: { constellationId },
  });
  if (!constellation) return null;

  const [faction, systems] = await Promise.all([
    constellation.factionId === null
      ? null
      : prisma.faction.findUnique({
          select: { factionId: true, name: true },
          where: { factionId: constellation.factionId },
        }),
    prisma.solarSystem.findMany({
      select: {
        solarSystemId: true,
        name: true,
        securityStatus: true,
        _count: { select: { stations: { where: { isDeleted: false } } } },
      },
      where: { constellationId },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    constellationId,
    name: constellation.name,
    region: {
      id: constellation.regionId,
      name: constellation.region?.name ?? null,
    },
    faction: faction ? { id: faction.factionId, name: faction.name } : null,
    wormholeClassId: constellation.wormholeClassId,
    systems: systems.map((system) => ({
      solarSystemId: system.solarSystemId,
      name: system.name,
      securityStatus: Number(system.securityStatus),
      stationCount: system._count.stations,
      siteRole: incursionSiteRole(system.solarSystemId) ?? null,
    })),
    neighbours: await readNeighbours(
      constellationId,
      systems.map((system) => system.solarSystemId),
    ),
  };
}

/** The constellations one stargate from these systems, by name. */
async function readNeighbours(
  constellationId: number,
  solarSystemIds: number[],
): Promise<NeighbouringConstellation[]> {
  const gates = await prisma.stargate.findMany({
    select: {
      solarSystem: { select: { solarSystemId: true, name: true } },
      DestinationStargate: {
        select: {
          solarSystem: {
            select: {
              solarSystemId: true,
              name: true,
              constellationId: true,
              constellation: {
                select: {
                  name: true,
                  regionId: true,
                  region: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
    where: { solarSystemId: { in: solarSystemIds }, isDeleted: false },
  });

  const neighbours = new Map<number, NeighbouringConstellation>();
  for (const gate of gates) {
    const there = gate.DestinationStargate?.solarSystem;
    if (!there || there.constellationId === constellationId) continue;
    let neighbour = neighbours.get(there.constellationId);
    if (!neighbour) {
      neighbour = {
        constellationId: there.constellationId,
        name: there.constellation.name,
        region: {
          id: there.constellation.regionId,
          name: there.constellation.region?.name ?? null,
        },
        gates: [],
      };
      neighbours.set(there.constellationId, neighbour);
    }
    neighbour.gates.push([
      { id: gate.solarSystem.solarSystemId, name: gate.solarSystem.name },
      { id: there.solarSystemId, name: there.name },
    ]);
  }
  return [...neighbours.values()]
    .map((neighbour) => ({
      ...neighbour,
      gates: neighbour.gates.sort(([a], [b]) =>
        (a.name ?? "").localeCompare(b.name ?? ""),
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Every incursion that spawned in the constellation, ours and imported (back to
 * 2015), most recent first. Not SDE data: `esi-track-incursions` writes it every
 * 5 minutes, so it keeps a short lifetime of its own. Uncaught, like the
 * constellation read.
 */
export async function readConstellationIncursions(
  constellationId: number,
): Promise<ConstellationIncursions> {
  "use cache";
  cacheLife("minutes");
  // System names in the tab come from the SDE read; refresh with it too.
  cacheTag(SDE_CACHE_TAG);

  const readAt = new Date();
  const incursions = await prisma.incursion.findMany({
    select: {
      incursionId: true,
      state: true,
      influence: true,
      hasBoss: true,
      stagingSolarSystemId: true,
      firstSeenAt: true,
      lastSeenAt: true,
      endedAt: true,
    },
    where: { constellationId },
    orderBy: { firstSeenAt: "desc" },
  });
  return {
    readAt: readAt.toISOString(),
    incursions: incursions.map((incursion) => ({
      ...incursion,
      firstSeenAt: incursion.firstSeenAt.toISOString(),
      lastSeenAt: incursion.lastSeenAt.toISOString(),
      endedAt: incursion.endedAt?.toISOString() ?? null,
    })),
  };
}
