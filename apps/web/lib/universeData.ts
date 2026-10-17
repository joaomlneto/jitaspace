import type {
  GateNeighbour,
  UniverseIncursion,
  UniverseSystem,
} from "~/components/UniversePage/types";
import { incursionSiteRole } from "~/app/incursions/siteRoles";
import { prisma } from "~/lib/db";

/**
 * Reads the region and constellation pages share. None caches: each caller
 * reads inside its own `"use cache"` scope, with the lifetime its data needs.
 */

/** Solar systems, by name, with their stations and incursion site. */
export async function readUniverseSystems(where: {
  constellationId: number | { in: number[] };
}): Promise<UniverseSystem[]> {
  const systems = await prisma.solarSystem.findMany({
    select: {
      solarSystemId: true,
      name: true,
      securityStatus: true,
      constellationId: true,
      _count: { select: { stations: { where: { isDeleted: false } } } },
    },
    where,
    orderBy: { name: "asc" },
  });
  return systems.map((system) => ({
    solarSystemId: system.solarSystemId,
    name: system.name,
    securityStatus: Number(system.securityStatus),
    constellationId: system.constellationId,
    stationCount: system._count.stations,
    siteRole: incursionSiteRole(system.solarSystemId) ?? null,
  }));
}

/**
 * The constellations, or regions, one stargate from these systems, by name,
 * each with the gates that lead there. `ownId` is the constellation or region
 * the systems are in, whose own gates are left out.
 */
export async function readGateNeighbours(
  solarSystemIds: number[],
  by: "constellation" | "region",
  ownId: number,
): Promise<GateNeighbour[]> {
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

  const neighbours = new Map<number, GateNeighbour>();
  for (const gate of gates) {
    const there = gate.DestinationStargate?.solarSystem;
    if (!there) continue;
    const { constellation } = there;
    const neighbour =
      by === "constellation"
        ? {
            id: there.constellationId,
            name: constellation.name,
            region: {
              id: constellation.regionId,
              name: constellation.region?.name ?? null,
            },
          }
        : {
            id: constellation.regionId,
            name: constellation.region?.name ?? String(constellation.regionId),
            region: null,
          };
    if (neighbour.id === ownId) continue;
    let entry = neighbours.get(neighbour.id);
    if (!entry) {
      entry = { ...neighbour, gates: [] };
      neighbours.set(neighbour.id, entry);
    }
    entry.gates.push([
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
 * Every incursion in these constellations, ours and imported (back to 2015),
 * most recent first.
 */
export async function readIncursionRecords(
  constellationIds: number[],
): Promise<UniverseIncursion[]> {
  const incursions = await prisma.incursion.findMany({
    select: {
      incursionId: true,
      constellationId: true,
      state: true,
      influence: true,
      hasBoss: true,
      stagingSolarSystemId: true,
      firstSeenAt: true,
      lastSeenAt: true,
      endedAt: true,
    },
    where: { constellationId: { in: constellationIds } },
    orderBy: { firstSeenAt: "desc" },
  });
  return incursions.map((incursion) => ({
    ...incursion,
    firstSeenAt: incursion.firstSeenAt.toISOString(),
    lastSeenAt: incursion.lastSeenAt.toISOString(),
    endedAt: incursion.endedAt?.toISOString() ?? null,
  }));
}
