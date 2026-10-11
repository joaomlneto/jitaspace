import { npcCorporationIdRanges } from "@jitaspace/esi-metadata";

import type {
  NamedRef,
  StationOperation,
  StationOrbit,
  StationPageData,
  StationSchool,
  StationService,
} from "./types";
import { prisma } from "~/lib/db";
import { cacheSdeRead } from "~/lib/sdeCache";

const [[NPC_CORPORATION_MIN, NPC_CORPORATION_MAX]] = npcCorporationIdRanges as [
  [number, number],
];

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name);

/** The celestial `orbitId` names: a moon, a planet or a star. */
async function readOrbit(orbitId: number | null): Promise<StationOrbit | null> {
  if (orbitId === null) return null;
  const [moon, planet, star] = await Promise.all([
    prisma.moon.findUnique({
      select: {
        name: true,
        planetId: true,
        planet: { select: { name: true } },
      },
      where: { moonId: orbitId },
    }),
    prisma.planet.findUnique({
      select: { name: true },
      where: { planetId: orbitId },
    }),
    prisma.star.findUnique({
      select: { name: true },
      where: { starId: orbitId },
    }),
  ]);
  if (moon) {
    return {
      kind: "moon",
      id: orbitId,
      name: moon.name,
      planet: { id: moon.planetId, name: moon.planet.name },
    };
  }
  if (planet)
    return { kind: "planet", id: orbitId, name: planet.name, planet: null };
  if (star) return { kind: "star", id: orbitId, name: star.name, planet: null };
  return null;
}

/**
 * The station's operation and the services it offers, each with the standing
 * the owner's faction demands for it, if any.
 */
async function readOperation(
  operationId: number | null,
  factionId: number | null,
): Promise<{
  operation: StationOperation | null;
  services: StationService[];
}> {
  if (operationId === null) return { operation: null, services: [] };
  const operation = await prisma.stationOperation.findUnique({
    select: {
      operationName: true,
      description: true,
      activityId: true,
      manufacturingFactor: true,
      researchFactor: true,
      services: { select: { serviceId: true }, where: { isDeleted: false } },
    },
    where: { stationOperationId: operationId },
  });
  if (!operation) return { operation: null, services: [] };

  const serviceIds = operation.services.map((service) => service.serviceId);
  const [activity, services, restrictions] = await Promise.all([
    prisma.corporationActivity.findUnique({
      select: { name: true },
      where: { corporationActivityId: operation.activityId },
    }),
    prisma.stationService.findMany({
      select: { stationServiceId: true, name: true, description: true },
      where: { stationServiceId: { in: serviceIds } },
    }),
    factionId === null
      ? []
      : prisma.stationStandingsRestriction.findMany({
          select: { stationServiceId: true, minimumStanding: true },
          where: {
            factionId,
            stationServiceId: { in: serviceIds },
            isDeleted: false,
          },
        }),
  ]);
  const standingByService = new Map(
    restrictions.map((r) => [r.stationServiceId, r.minimumStanding]),
  );

  return {
    operation: {
      id: operationId,
      name: operation.operationName,
      description: operation.description,
      activity: activity
        ? { id: operation.activityId, name: activity.name }
        : null,
      manufacturingFactor: operation.manufacturingFactor,
      researchFactor: operation.researchFactor,
    },
    services: services
      .map((service) => ({
        serviceId: service.stationServiceId,
        name: service.name ?? `Service ${service.stationServiceId}`,
        // The SDE leaves most descriptions empty rather than absent.
        description: service.description === "" ? null : service.description,
        minimumStanding:
          standingByService.get(service.stationServiceId) ?? null,
      }))
      .sort((a, b) => a.serviceId - b.serviceId),
  };
}

/** The schools whose new capsuleers start their careers here. */
async function readSchools(stationId: number): Promise<StationSchool[]> {
  const rows = await prisma.schoolStartingStation.findMany({
    select: {
      school: { select: { schoolId: true, name: true, raceId: true } },
    },
    where: { stationId, isDeleted: false },
  });
  const raceIds = [...new Set(rows.map((row) => row.school.raceId))];
  const races =
    raceIds.length === 0
      ? []
      : await prisma.race.findMany({
          select: { raceId: true, name: true },
          where: { raceId: { in: raceIds } },
        });
  const raceName = new Map(races.map((race) => [race.raceId, race.name]));
  return rows
    .map(({ school }) => ({
      schoolId: school.schoolId,
      name: school.name,
      race: {
        id: school.raceId,
        name: raceName.get(school.raceId) ?? null,
      },
    }))
    .sort(byName);
}

/** NPC corporations headquartered at the station. */
async function readHeadquarters(stationId: number): Promise<NamedRef[]> {
  const corporations = await prisma.corporation.findMany({
    select: { corporationId: true, name: true },
    // Player corporations can name an NPC station as their home too, by the
    // thousand at a trade hub: list only the NPC ones, which the SDE places.
    where: {
      homeStationId: stationId,
      corporationId: { gte: NPC_CORPORATION_MIN, lte: NPC_CORPORATION_MAX },
      isDeleted: false,
    },
  });
  return corporations
    .map((corporation) => ({
      id: corporation.corporationId,
      name: corporation.name,
    }))
    .sort(byName);
}

/**
 * Everything the station page shows, or null when there is no such station.
 *
 * Cached until the next SDE build is ingested. The ESI station scraper also
 * writes station rows, but it only runs by hand, and its changes show up at the
 * next SDE ingest. Nothing is caught inside this scope — a failed query
 * must throw out of it, because the `notFound()` the caller would otherwise
 * render is a *successful* response that Next stores (apps/web/CLAUDE.md).
 * `findUnique` plus a null test is what keeps a genuinely absent station — a
 * real, legitimately cached 404 — distinguishable from an outage.
 *
 * `generateMetadata` and the page share this one read, so the metadata pass
 * and the render resolve to the same cache entry.
 */
export async function readStation(
  stationId: number,
): Promise<StationPageData | null> {
  "use cache";
  cacheSdeRead();

  const station = await prisma.station.findUnique({
    select: {
      name: true,
      typeId: true,
      stationType: { select: { name: true } },
      raceId: true,
      race: { select: { name: true } },
      ownerId: true,
      owner: {
        select: {
          name: true,
          factionId: true,
          faction: { select: { name: true } },
        },
      },
      solarSystem: {
        select: {
          solarSystemId: true,
          name: true,
          securityStatus: true,
          constellation: {
            select: {
              constellationId: true,
              name: true,
              regionId: true,
              region: { select: { name: true } },
            },
          },
        },
      },
      operationId: true,
      orbitId: true,
      reprocessingEfficiency: true,
      reprocessingStationsTake: true,
      maxDockableShipVolume: true,
      officeRentalCost: true,
      Agent: {
        select: {
          characterId: true,
          Character: { select: { name: true, corporationId: true } },
          agentTypeId: true,
          AgentType: { select: { name: true } },
          agentDivisionId: true,
          AgentDivision: { select: { name: true } },
          isLocator: true,
          level: true,
        },
        where: { isDeleted: false },
      },
    },
    where: { stationId },
  });
  if (!station) return null;

  const factionId = station.owner?.factionId ?? null;
  const [orbit, { operation, services }, schools, headquarters] =
    await Promise.all([
      readOrbit(station.orbitId),
      readOperation(station.operationId, factionId),
      readSchools(stationId),
      readHeadquarters(stationId),
    ]);

  const { solarSystem } = station;
  const agentTypes = new Map<number, string>();
  const agentDivisions = new Map<number, string>();
  for (const agent of station.Agent) {
    agentTypes.set(agent.agentTypeId, agent.AgentType.name);
    agentDivisions.set(agent.agentDivisionId, agent.AgentDivision.name);
  }

  return {
    stationId,
    name: station.name,
    type: { id: station.typeId, name: station.stationType.name },
    race:
      station.raceId === null
        ? null
        : { id: station.raceId, name: station.race?.name ?? null },
    owner:
      station.ownerId === null
        ? null
        : { id: station.ownerId, name: station.owner?.name ?? null },
    faction:
      factionId === null
        ? null
        : { id: factionId, name: station.owner?.faction?.name ?? null },
    location: solarSystem && {
      solarSystem: { id: solarSystem.solarSystemId, name: solarSystem.name },
      securityStatus: solarSystem.securityStatus.toNumber(),
      constellation: {
        id: solarSystem.constellation.constellationId,
        name: solarSystem.constellation.name,
      },
      region: {
        id: solarSystem.constellation.regionId,
        name: solarSystem.constellation.region?.name ?? null,
      },
    },
    orbit,
    operation,
    services,
    reprocessingEfficiency: station.reprocessingEfficiency,
    reprocessingStationsTake: station.reprocessingStationsTake,
    maxDockableShipVolume: station.maxDockableShipVolume,
    officeRentalCost: station.officeRentalCost,
    schools,
    headquarters,
    agents: station.Agent.map((agent) => ({
      characterId: agent.characterId,
      name: agent.Character.name,
      corporationId: agent.Character.corporationId,
      agentTypeId: agent.agentTypeId,
      agentDivisionId: agent.agentDivisionId,
      isLocator: agent.isLocator,
      level: agent.level,
      stationId,
    })).sort((a, b) => b.level - a.level || a.name.localeCompare(b.name)),
    agentTypes: [...agentTypes].map(([agentTypeId, name]) => ({
      agentTypeId,
      name,
    })),
    agentDivisions: [...agentDivisions].map(
      ([npcCorporationDivisionId, name]) => ({
        npcCorporationDivisionId,
        name,
      }),
    ),
  };
}
