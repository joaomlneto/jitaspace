import pLimit from "p-limit";

import {
  getUniverseAsteroidBeltsAsteroidBeltId,
  getUniverseMoonsMoonId,
  getUniversePlanetsPlanetId,
  getUniverseStarsStarId,
  getUniverseSystems,
  getUniverseSystemsSystemId,
} from "@jitaspace/esi-client";

import type { BatchStepResult, CrudStatistics } from "../../../types";
import { defineJob } from "../../../core";
import { Prisma, prisma } from "../../../db";
import { excludeObjectKeys, updateTable } from "../../../utils";

export interface ScrapeSolarSystemsEventPayload {
  data: {
    batchSize?: number;
  };
}

type StatsKey =
  | "solarSystems"
  | "planets"
  //| "stations"
  | "stars"
  | "moons"
  | "asteroidBelts";

type Limit = ReturnType<typeof pLimit>;

// Strip the local-only timestamp columns so DB rows can be compared against
// the ESI payloads. Extracted to module scope to keep the per-table callbacks
// from nesting functions too deeply (sonar S2004).
const stripTimestamps = <T extends { createdAt: unknown; updatedAt: unknown }>(
  entries: T[],
) =>
  entries.map((entry) => excludeObjectKeys(entry, ["updatedAt", "createdAt"]));

const fetchSolarSystem = (limit: Limit, solarSystemId: number) =>
  limit(async () =>
    getUniverseSystemsSystemId(solarSystemId).then((res) => res.data),
  );

const fetchSolarSystemRow = (limit: Limit, solarSystemId: number) =>
  limit(async () =>
    getUniverseSystemsSystemId(solarSystemId)
      .then((res) => res.data)
      .then((solarSystem) => ({
        solarSystemId: solarSystem.system_id,
        constellationId: solarSystem.constellation_id,
        name: solarSystem.name,
        securityClass: solarSystem.security_class ?? null,
        securityStatus: new Prisma.Decimal(solarSystem.security_status),
        starId: solarSystem.star_id ?? null,
        isDeleted: false,
      })),
  );

const fetchPlanetRow = (limit: Limit, planetId: number) =>
  limit(async () =>
    getUniversePlanetsPlanetId(planetId)
      .then((res) => res.data)
      .then((planet) => ({
        solarSystemId: planet.system_id,
        planetId: planet.planet_id,
        name: planet.name,
        typeId: planet.type_id,
        isDeleted: false,
      })),
  );

const fetchMoonRow = (
  limit: Limit,
  moonPlanetIndex: Record<number, number>,
  moonId: number,
) =>
  limit(async () =>
    getUniverseMoonsMoonId(moonId)
      .then((res) => res.data)
      .then((moon) => {
        const planetId = moonPlanetIndex[moon.moon_id];
        if (planetId === undefined) {
          throw new Error(`No planetId indexed for moon ${moon.moon_id}`);
        }
        return {
          moonId: moon.moon_id,
          name: moon.name,
          planetId,
          isDeleted: false,
        };
      }),
  );

const fetchAsteroidBeltRow = (
  limit: Limit,
  asteroidBeltPlanetIndex: Record<number, number>,
  asteroidBeltId: number,
) =>
  limit(async () =>
    getUniverseAsteroidBeltsAsteroidBeltId(asteroidBeltId)
      .then((res) => res.data)
      .then((asteroidBelt) => {
        const planetId = asteroidBeltPlanetIndex[asteroidBeltId];
        if (planetId === undefined) {
          throw new Error(
            `No planetId indexed for asteroid belt ${asteroidBeltId}`,
          );
        }
        return {
          asteroidBeltId: asteroidBeltId,
          name: asteroidBelt.name,
          planetId,
          isDeleted: false,
        };
      }),
  );

const fetchStarRow = (limit: Limit, starId: number) =>
  limit(async () => {
    const { data: star } = await getUniverseStarsStarId(starId);
    // Widen the ESI spectral-class enum to string (via an annotated local, not
    // a cast) so the inferred StarRow matches the Prisma column type and the
    // local-entries shape when updateTable infers a single row type from both.
    const spectralClass: string = star.spectral_class;
    return {
      starId,
      name: star.name,
      solarSystemId: star.solar_system_id,
      age: BigInt(star.age),
      luminosity: new Prisma.Decimal(star.luminosity),
      radius: BigInt(star.radius),
      spectralClass,
      temperature: BigInt(star.temperature),
      typeId: star.type_id,
      isDeleted: false,
    };
  });

type SolarSystemRow = Awaited<ReturnType<typeof fetchSolarSystemRow>>;
type PlanetRow = Awaited<ReturnType<typeof fetchPlanetRow>>;
type MoonRow = Awaited<ReturnType<typeof fetchMoonRow>>;
type AsteroidBeltRow = Awaited<ReturnType<typeof fetchAsteroidBeltRow>>;
type StarRow = Awaited<ReturnType<typeof fetchStarRow>>;

const updateSolarSystem = (limit: Limit, entry: SolarSystemRow) =>
  limit(async () =>
    prisma.solarSystem.update({
      data: entry,
      where: { solarSystemId: entry.solarSystemId },
    }),
  );

const updatePlanet = (limit: Limit, entry: PlanetRow) =>
  limit(async () =>
    prisma.planet.update({
      data: entry,
      where: { planetId: entry.planetId },
    }),
  );

const updateMoon = (limit: Limit, entry: MoonRow) =>
  limit(async () =>
    prisma.moon.update({
      data: entry,
      where: { moonId: entry.moonId },
    }),
  );

const updateAsteroidBelt = (limit: Limit, entry: AsteroidBeltRow) =>
  limit(async () =>
    prisma.asteroidBelt.update({
      data: entry,
      where: { asteroidBeltId: entry.asteroidBeltId },
    }),
  );

const updateStar = (limit: Limit, entry: StarRow) =>
  limit(async () =>
    prisma.star.update({
      data: entry,
      where: { starId: entry.starId },
    }),
  );

export const scrapeEsiSolarSystems = defineJob<
  ScrapeSolarSystemsEventPayload["data"]
>({
  id: "scrape-esi-solar-systems",
  name: "Scrape Solar Systems",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  retries: 5,
  maxDurationSeconds: 3600,
  handler: async (ctx) => {
    const batchSize = ctx.payload.batchSize ?? 20;

    // Get all Solar System IDs in ESI
    const batches = await ctx.run("Fetch Solar System IDs", async () => {
      const solarSystemIds = await getUniverseSystems().then((res) => res.data);
      solarSystemIds.sort((a, b) => a - b);

      const numBatches = Math.ceil(solarSystemIds.length / batchSize);
      const batchIds = (batchIndex: number) =>
        solarSystemIds.slice(
          batchIndex * batchSize,
          (batchIndex + 1) * batchSize,
        );
      return [...new Array(numBatches).keys()].map((batchId) =>
        batchIds(batchId),
      );
    });

    const results: (BatchStepResult<StatsKey> & {
      stargateIds: number[];
      stationIds: number[];
    })[] = [];
    const limit = pLimit(20);

    for (const [i, thisBatchIds] of batches.entries()) {
      const result = await ctx.run(
        `Batch ${i + 1}/${batches.length}`,
        async (): Promise<(typeof results)[number]> => {
          const stepStartTime = performance.now();

          const esiSolarSystems = await Promise.all(
            thisBatchIds.map((solarSystemId) =>
              fetchSolarSystem(limit, solarSystemId),
            ),
          );

          const thisBatchPlanets = esiSolarSystems.flatMap(
            (solarSystem) => solarSystem.planets ?? [],
          );

          const thisBatchPlanetIds = thisBatchPlanets.map(
            (planet) => planet.planet_id,
          );

          const thisBatchStargateIds = esiSolarSystems.flatMap(
            (solarSystem) => solarSystem.stargates ?? [],
          );

          const thisBatchStationIds = esiSolarSystems.flatMap(
            (solarSystem) => solarSystem.stations ?? [],
          );

          const thisBatchStarIds = esiSolarSystems
            .map((solarSystem) => solarSystem.star_id)
            .filter((starId): starId is number => Boolean(starId));

          const thisBatchMoons = thisBatchPlanets.flatMap((planet) =>
            (planet.moons ?? []).map((moonId) => ({
              planetId: planet.planet_id,
              moonId,
            })),
          );

          const thisBatchMoonIds = thisBatchMoons.map((moon) => moon.moonId);

          // map moonId to planetId
          const moonPlanetIndex: Record<number, number> = {};
          thisBatchMoons.forEach(
            (moon) => (moonPlanetIndex[moon.moonId] = moon.planetId),
          );

          const thisBatchAsteroidBelts = thisBatchPlanets.flatMap((planet) =>
            (planet.asteroid_belts ?? []).map((asteroidBeltId) => ({
              planetId: planet.planet_id,
              asteroidBeltId,
            })),
          );

          const thisBatchAsteroidBeltIds = thisBatchAsteroidBelts.map(
            (asteroidBelt) => asteroidBelt.asteroidBeltId,
          );

          // map asteroidBeltId to planetId
          const asteroidBeltPlanetIndex: Record<number, number> = {};
          thisBatchAsteroidBelts.forEach(
            (asteroidBelt) =>
              (asteroidBeltPlanetIndex[asteroidBelt.asteroidBeltId] =
                asteroidBelt.planetId),
          );

          const solarSystemChanges = await updateTable({
            fetchLocalEntries: async () =>
              prisma.solarSystem
                .findMany({
                  where: {
                    solarSystemId: {
                      in: thisBatchIds,
                    },
                  },
                })
                .then(stripTimestamps),
            fetchRemoteEntries: async () =>
              Promise.all(
                thisBatchIds.map((solarSystemId) =>
                  fetchSolarSystemRow(limit, solarSystemId),
                ),
              ),
            batchCreate: (entries) =>
              limit(() =>
                prisma.solarSystem.createMany({
                  data: entries,
                }),
              ),
            batchDelete: (entries) =>
              prisma.solarSystem.updateMany({
                data: {
                  isDeleted: true,
                },
                where: {
                  solarSystemId: {
                    in: entries.map((entry) => entry.solarSystemId),
                  },
                },
              }),
            batchUpdate: (entries) =>
              Promise.all(
                entries.map((entry) => updateSolarSystem(limit, entry)),
              ),
            idAccessor: (e) => e.solarSystemId,
          });

          const planetChanges = await updateTable({
            fetchLocalEntries: async () =>
              prisma.planet
                .findMany({
                  where: {
                    planetId: {
                      in: thisBatchPlanetIds,
                    },
                  },
                })
                .then(stripTimestamps),
            fetchRemoteEntries: async () =>
              Promise.all(
                thisBatchPlanetIds.map((planetId) =>
                  fetchPlanetRow(limit, planetId),
                ),
              ),
            batchCreate: (entries) =>
              limit(() =>
                prisma.planet.createMany({
                  data: entries,
                }),
              ),
            batchDelete: (entries) =>
              prisma.planet.updateMany({
                data: {
                  isDeleted: true,
                },
                where: {
                  planetId: {
                    in: entries.map((entry) => entry.planetId),
                  },
                },
              }),
            batchUpdate: (entries) =>
              Promise.all(entries.map((entry) => updatePlanet(limit, entry))),
            idAccessor: (e) => e.planetId,
          });

          /*
                                        const stationChanges = await updateTable({
                                          fetchLocalEntries: async () =>
                                            prisma.station
                                              .findMany({
                                                where: {
                                                  stationId: {
                                                    in: thisBatchStationIds,
                                                  },
                                                },
                                              })
                                              .then((entries) =>
                                                entries.map((entry) =>
                                                  excludeObjectKeys(entry, ["updatedAt", "createdAt"]),
                                                ),
                                              ),
                                          fetchRemoteEntries: async () =>
                                            Promise.all(
                                              thisBatchStationIds.map((stationId) =>
                                                limit(async () =>
                                                  getUniverseStationsStationId(stationId)
                                                    .then((res) => res.data)
                                                    .then((station) => ({
                                                      stationId: station.station_id,
                                                      name: station.name,
                                                      solarSystemId: station.system_id,
                                                      typeId: station.type_id,
                                                      maxDockableShipVolume: station.max_dockable_ship_volume,
                                                      officeRentalCost: station.office_rental_cost,
                                                      ownerId: station.owner ?? null,
                                                      raceId: station.race_id ?? null,
                                                      reprocessingEfficiency: station.reprocessing_efficiency,
                                                      reprocessingStationsTake:
                                                        station.reprocessing_stations_take,
                                                      isDeleted: false,
                                                    })),
                                                ),
                                              ),
                                            ),
                                          batchCreate: (entries) =>
                                            limit(() =>
                                              prisma.station.createMany({
                                                data: entries,
                                              }),
                                            ),
                                          batchDelete: (entries) =>
                                            prisma.station.updateMany({
                                              data: {
                                                isDeleted: true,
                                              },
                                              where: {
                                                stationId: {
                                                  in: entries.map((entry) => entry.stationId),
                                                },
                                              },
                                            }),
                                          batchUpdate: (entries) =>
                                            Promise.all(
                                              entries.map((entry) =>
                                                limit(async () =>
                                                  prisma.station.update({
                                                    data: entry,
                                                    where: { stationId: entry.stationId },
                                                  }),
                                                ),
                                              ),
                                            ),
                                          idAccessor: (e) => e.stationId,
                                        });*/

          const moonChanges = await updateTable({
            fetchLocalEntries: async () =>
              prisma.moon
                .findMany({
                  where: {
                    moonId: {
                      in: thisBatchMoonIds,
                    },
                  },
                })
                .then(stripTimestamps),
            fetchRemoteEntries: async () =>
              Promise.all(
                thisBatchMoonIds.map((moonId) =>
                  fetchMoonRow(limit, moonPlanetIndex, moonId),
                ),
              ),
            batchCreate: (entries) =>
              limit(() =>
                prisma.moon.createMany({
                  data: entries,
                }),
              ),
            batchDelete: (entries) =>
              prisma.moon.updateMany({
                data: {
                  isDeleted: true,
                },
                where: {
                  moonId: {
                    in: entries.map((entry) => entry.moonId),
                  },
                },
              }),
            batchUpdate: (entries) =>
              Promise.all(entries.map((entry) => updateMoon(limit, entry))),
            idAccessor: (e) => e.moonId,
          });

          const asteroidBeltChanges = await updateTable({
            fetchLocalEntries: async () =>
              prisma.asteroidBelt
                .findMany({
                  where: {
                    asteroidBeltId: {
                      in: thisBatchAsteroidBeltIds,
                    },
                  },
                })
                .then(stripTimestamps),
            fetchRemoteEntries: async () =>
              Promise.all(
                thisBatchAsteroidBeltIds.map((asteroidBeltId) =>
                  fetchAsteroidBeltRow(
                    limit,
                    asteroidBeltPlanetIndex,
                    asteroidBeltId,
                  ),
                ),
              ),
            batchCreate: (entries) =>
              limit(() =>
                prisma.asteroidBelt.createMany({
                  data: entries,
                }),
              ),
            batchDelete: (entries) =>
              prisma.asteroidBelt.updateMany({
                data: {
                  isDeleted: true,
                },
                where: {
                  asteroidBeltId: {
                    in: entries.map((entry) => entry.asteroidBeltId),
                  },
                },
              }),
            batchUpdate: (entries) =>
              Promise.all(
                entries.map((entry) => updateAsteroidBelt(limit, entry)),
              ),
            idAccessor: (e) => e.asteroidBeltId,
          });

          const starChanges = await updateTable({
            fetchLocalEntries: async () =>
              prisma.star
                .findMany({
                  where: {
                    starId: {
                      in: thisBatchStarIds,
                    },
                  },
                })
                .then(stripTimestamps),
            fetchRemoteEntries: async () =>
              Promise.all(
                thisBatchStarIds.map((starId) => fetchStarRow(limit, starId)),
              ),
            batchCreate: (entries) =>
              limit(() =>
                prisma.star.createMany({
                  data: entries,
                }),
              ),
            batchDelete: (entries) =>
              prisma.star.updateMany({
                data: {
                  isDeleted: true,
                },
                where: {
                  starId: {
                    in: entries.map((entry) => entry.starId),
                  },
                },
              }),
            batchUpdate: (entries) =>
              Promise.all(entries.map((entry) => updateStar(limit, entry))),
            idAccessor: (e) => e.starId,
          });

          return {
            stats: {
              solarSystems: solarSystemChanges,
              planets: planetChanges,
              //stations: stationChanges,
              stars: starChanges,
              moons: moonChanges,
              asteroidBelts: asteroidBeltChanges,
            },
            stargateIds: thisBatchStargateIds,
            stationIds: thisBatchStationIds,
            elapsed: performance.now() - stepStartTime,
          };
        },
      );
      results.push(result);
    }

    // scrape Stargates (fire-and-forget)
    await ctx.send("scrape-esi-stargates", {
      stargateIds: [
        ...new Set(results.flatMap((result) => result.stargateIds)),
      ],
    });

    // scrape Stations (fire-and-forget)
    await ctx.send("scrape-esi-stations", {
      stationIds: [...new Set(results.flatMap((result) => result.stationIds))],
    });

    const totals: BatchStepResult<StatsKey> = {
      stats: {
        solarSystems: {
          created: 0,
          deleted: 0,
          modified: 0,
          equal: 0,
        },
        planets: {
          created: 0,
          deleted: 0,
          modified: 0,
          equal: 0,
        },
        stars: {
          created: 0,
          deleted: 0,
          modified: 0,
          equal: 0,
        },
        moons: {
          created: 0,
          deleted: 0,
          modified: 0,
          equal: 0,
        },
        asteroidBelts: {
          created: 0,
          deleted: 0,
          modified: 0,
          equal: 0,
        },
      },
      elapsed: 0,
    };
    results.forEach((stepResult) => {
      Object.entries(stepResult.stats).forEach(([category, value]) => {
        Object.keys(value).forEach(
          (op) =>
            (totals.stats[category as StatsKey][op as keyof CrudStatistics] +=
              stepResult.stats[category as StatsKey][
                op as keyof CrudStatistics
              ]),
        );
      });
      totals.elapsed += stepResult.elapsed;
    });

    return totals;
  },
});
