import axios from "axios";
import pLimit from "p-limit";

import { Prisma, prisma } from "@jitaspace/db";
import {
  getUniverseAsteroidBeltsAsteroidBeltId,
  getUniverseMoonsMoonId,
  getUniversePlanetsPlanetId,
  getUniverseStargatesStargateId,
  getUniverseStationsStationId,
  getUniverseSystems,
  getUniverseSystemsSystemId,
} from "@jitaspace/esi-client";

import { inngest } from "../../../client";
import { BatchStepResult, CrudStatistics } from "../../../types";
import { excludeObjectKeys, updateTable } from "../../../utils";

export type ScrapeSolarSystemsEventPayload = {
  data: {
    batchSize?: number;
  };
};

type StatsKey =
  | "solarSystems"
  | "planets"
  | "stargates"
  | "stations"
  | "moons"
  | "asteroidBelts";

export const scrapeEsiSolarSystems = inngest.createFunction(
  {
    name: "Scrape Solar Systems",
    concurrency: {
      limit: 1,
    },
  },
  { event: "scrape/esi/solar-systems" },
  async ({ step, event }) => {
    // FIXME: THIS SHOULD NOT BE NECESSARY
    axios.defaults.baseURL = "https://esi.evetech.net/latest";
    const batchSize = event.data.batchSize ?? 100;

    // Get all Solar System IDs in ESI
    const batches = await step.run("Fetch Solar System IDs", async () => {
      const solarSystemIds = await getUniverseSystems().then((res) => res.data);
      solarSystemIds.sort((a, b) => a - b);

      const numBatches = Math.ceil(solarSystemIds.length / batchSize);
      const batchIds = (batchIndex: number) =>
        solarSystemIds.slice(
          batchIndex * batchSize,
          (batchIndex + 1) * batchSize,
        );
      return [...Array(numBatches).keys()].map((batchId) => batchIds(batchId));
    });

    let results: BatchStepResult<StatsKey>[] = [];
    const limit = pLimit(20);

    for (let i = 0; i < batches.length; i++) {
      const result = await step.run(
        `Batch ${i + 1}/${batches.length}`,
        async (): Promise<BatchStepResult<StatsKey>> => {
          const stepStartTime = performance.now();
          const thisBatchIds = batches[i]!;

          const esiSolarSystems = await Promise.all(
            thisBatchIds.map((solarSystemId) =>
              limit(async () =>
                getUniverseSystemsSystemId(solarSystemId).then(
                  (res) => res.data,
                ),
              ),
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
                .then((entries) =>
                  entries.map((entry) =>
                    excludeObjectKeys(entry, ["updatedAt"]),
                  ),
                ),
            fetchRemoteEntries: async () =>
              Promise.all(
                thisBatchIds.map((solarSystemId) =>
                  limit(async () =>
                    getUniverseSystemsSystemId(solarSystemId)
                      .then((res) => res.data)
                      .then((solarSystem) => ({
                        solarSystemId: solarSystem.system_id,
                        constellationId: solarSystem.constellation_id,
                        name: solarSystem.name,
                        securityClass: solarSystem.security_class ?? null,
                        securityStatus: new Prisma.Decimal(
                          solarSystem.security_status,
                        ),
                        starId: solarSystem.star_id ?? null,
                        isDeleted: false,
                      })),
                  ),
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
                entries.map((entry) =>
                  limit(async () =>
                    prisma.solarSystem.update({
                      data: entry,
                      where: { solarSystemId: entry.solarSystemId },
                    }),
                  ),
                ),
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
                .then((entries) =>
                  entries.map((entry) =>
                    excludeObjectKeys(entry, ["updatedAt"]),
                  ),
                ),
            fetchRemoteEntries: async () =>
              Promise.all(
                thisBatchPlanetIds.map((planetId) =>
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
                  ),
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
              Promise.all(
                entries.map((entry) =>
                  limit(async () =>
                    prisma.planet.update({
                      data: entry,
                      where: { planetId: entry.planetId },
                    }),
                  ),
                ),
              ),
            idAccessor: (e) => e.planetId,
          });

          const stargateChanges = await updateTable({
            fetchLocalEntries: async () =>
              prisma.stargate
                .findMany({
                  where: {
                    stargateId: {
                      in: thisBatchStargateIds,
                    },
                  },
                })
                .then((entries) =>
                  entries.map((entry) =>
                    excludeObjectKeys(entry, ["updatedAt"]),
                  ),
                ),
            fetchRemoteEntries: async () =>
              Promise.all(
                thisBatchStargateIds.map((stargateId) =>
                  limit(async () =>
                    getUniverseStargatesStargateId(stargateId)
                      .then((res) => res.data)
                      .then((stargate) => ({
                        stargateId: stargate.stargate_id,
                        name: stargate.name,
                        solarSystemId: stargate.system_id,
                        destinationStargateId: stargate.destination.stargate_id,
                        isDeleted: false,
                      })),
                  ),
                ),
              ),
            batchCreate: (entries) =>
              limit(() =>
                prisma.stargate.createMany({
                  data: entries,
                }),
              ),
            batchDelete: (entries) =>
              prisma.stargate.updateMany({
                data: {
                  isDeleted: true,
                },
                where: {
                  stargateId: {
                    in: entries.map((entry) => entry.stargateId),
                  },
                },
              }),
            batchUpdate: (entries) =>
              Promise.all(
                entries.map((entry) =>
                  limit(async () =>
                    prisma.stargate.update({
                      data: entry,
                      where: { stargateId: entry.stargateId },
                    }),
                  ),
                ),
              ),
            idAccessor: (e) => e.stargateId,
          });

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
                    excludeObjectKeys(entry, ["updatedAt"]),
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
          });

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
                .then((entries) =>
                  entries.map((entry) =>
                    excludeObjectKeys(entry, ["updatedAt"]),
                  ),
                ),
            fetchRemoteEntries: async () =>
              Promise.all(
                thisBatchMoonIds.map((moonId) =>
                  limit(async () =>
                    getUniverseMoonsMoonId(moonId)
                      .then((res) => res.data)
                      .then((moon) => ({
                        moonId: moon.moon_id,
                        name: moon.name,
                        planetId: moonPlanetIndex[moon.moon_id]!,
                      })),
                  ),
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
              Promise.all(
                entries.map((entry) =>
                  limit(async () =>
                    prisma.moon.update({
                      data: entry,
                      where: { moonId: entry.moonId },
                    }),
                  ),
                ),
              ),
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
                .then((entries) =>
                  entries.map((entry) =>
                    excludeObjectKeys(entry, ["updatedAt"]),
                  ),
                ),
            fetchRemoteEntries: async () =>
              Promise.all(
                thisBatchAsteroidBeltIds.map((asteroidBeltId) =>
                  limit(async () =>
                    getUniverseAsteroidBeltsAsteroidBeltId(asteroidBeltId)
                      .then((res) => res.data)
                      .then((asteroidBelt) => ({
                        asteroidBeltId: asteroidBeltId,
                        name: asteroidBelt.name,
                        planetId: asteroidBeltPlanetIndex[asteroidBeltId]!,
                      })),
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
                entries.map((entry) =>
                  limit(async () =>
                    prisma.asteroidBelt.update({
                      data: entry,
                      where: { asteroidBeltId: entry.asteroidBeltId },
                    }),
                  ),
                ),
              ),
            idAccessor: (e) => e.asteroidBeltId,
          });

          return {
            stats: {
              solarSystems: {
                created: solarSystemChanges.created,
                deleted: solarSystemChanges.deleted,
                modified: solarSystemChanges.modified,
                equal: solarSystemChanges.equal,
              },
              planets: {
                created: planetChanges.created,
                deleted: planetChanges.deleted,
                modified: planetChanges.modified,
                equal: planetChanges.equal,
              },
              stargates: {
                created: stargateChanges.created,
                deleted: stargateChanges.deleted,
                modified: stargateChanges.modified,
                equal: stargateChanges.equal,
              },
              stations: {
                created: stationChanges.created,
                deleted: stationChanges.deleted,
                modified: stationChanges.modified,
                equal: stationChanges.equal,
              },
              moons: {
                created: moonChanges.created,
                deleted: moonChanges.deleted,
                modified: moonChanges.modified,
                equal: moonChanges.equal,
              },
              asteroidBelts: {
                created: asteroidBeltChanges.created,
                deleted: asteroidBeltChanges.deleted,
                modified: asteroidBeltChanges.modified,
                equal: asteroidBeltChanges.equal,
              },
            },
            elapsed: performance.now() - stepStartTime,
          };
        },
      );
      results.push(result);
    }

    return await step.run("Compute Aggregates", async () => {
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
          stargates: {
            created: 0,
            deleted: 0,
            modified: 0,
            equal: 0,
          },
          stations: {
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
    });
  },
);
