import pLimit from "p-limit";

import { getUniversePlanetsPlanetId } from "@jitaspace/esi-client";

import type { BatchStepResult, CrudStatistics } from "../../../types";
import { defineJob, NonRetriableError } from "../../../core";
import { prisma } from "../../../db";
import { excludeObjectKeys, updateTable } from "../../../utils";

export interface ScrapePlanetsEventPayload {
  data: {
    planetIds: number[];
    batchSize?: number;
  };
}

type StatsKey = "planets";

type LimitFunction = ReturnType<typeof pLimit>;

type EsiPlanet = Awaited<ReturnType<typeof getUniversePlanetsPlanetId>>["data"];

const fetchPlanetsForBatch = (thisBatchIds: number[], limit: LimitFunction) =>
  Promise.all(
    thisBatchIds.map((planetId) =>
      limit(async () =>
        getUniversePlanetsPlanetId(planetId).then((res) => res.data),
      ),
    ),
  );

const updatePlanetsBatch = (
  thisBatchIds: number[],
  thisBatchPlanets: EsiPlanet[],
  limit: LimitFunction,
) =>
  updateTable({
    fetchLocalEntries: async () =>
      prisma.planet
        .findMany({
          where: {
            planetId: {
              in: thisBatchIds,
            },
          },
        })
        .then((entries) =>
          entries.map((entry) =>
            excludeObjectKeys(entry, ["updatedAt", "createdAt"]),
          ),
        ),
    fetchRemoteEntries: async () =>
      thisBatchPlanets.map((planet) => ({
        solarSystemId: planet.system_id,
        planetId: planet.planet_id,
        name: planet.name,
        typeId: planet.type_id,
        isDeleted: false,
      })),
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

export const scrapeEsiPlanets = defineJob<ScrapePlanetsEventPayload["data"]>({
  id: "scrape-esi-planets",
  trigger: { type: "event" },
  name: "Scrape Planets",
  concurrencyLimit: 1,
  retries: 5,
  handler: async (ctx) => {
    const batchSize = ctx.payload.batchSize ?? 1000;
    const planetIds: number[] = ctx.payload.planetIds;

    if ((ctx.payload.planetIds ?? []).length == 0)
      throw new NonRetriableError("Invalid planetIds");

    // Split IDs in batches
    const batches = await ctx.run("Fetch Solar System IDs", async () => {
      planetIds.sort((a, b) => a - b);

      const numBatches = Math.ceil(planetIds.length / batchSize);
      const batchIds = (batchIndex: number) =>
        planetIds.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);
      return [...new Array(numBatches).keys()].map((batchId) =>
        batchIds(batchId),
      );
    });

    const results: BatchStepResult<StatsKey>[] = [];
    const limit = pLimit(20);

    const moons: { moonId: number; planetId: number }[] = [];

    for (let i = 0; i < batches.length; i++) {
      const result = await ctx.run(
        `Batch ${i + 1}/${batches.length}`,
        async (): Promise<BatchStepResult<StatsKey>> => {
          console.log(`starting batch ${i + 1}`);
          const stepStartTime = performance.now();
          const thisBatchIds = batches[i]!;

          const thisBatchPlanets = await fetchPlanetsForBatch(
            thisBatchIds,
            limit,
          );

          const planetChanges = await updatePlanetsBatch(
            thisBatchIds,
            thisBatchPlanets,
            limit,
          );

          return {
            stats: {
              planets: {
                created: planetChanges.created,
                deleted: planetChanges.deleted,
                modified: planetChanges.modified,
                equal: planetChanges.equal,
              },
            },
            elapsed: performance.now() - stepStartTime,
          };
        },
      );
      results.push(result);
    }

    const totals: BatchStepResult<StatsKey> = {
      stats: {
        planets: {
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
