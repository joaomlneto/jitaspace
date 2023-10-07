import axios from "axios";
import { NonRetriableError } from "inngest";
import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import { getUniversePlanetsPlanetId } from "@jitaspace/esi-client-kubb";

import { inngest } from "../../../client";
import { BatchStepResult, CrudStatistics } from "../../../types";
import { excludeObjectKeys, updateTable } from "../../../utils";

export type ScrapePlanetsEventPayload = {
  data: {
    planetIds: number[];
    batchSize?: number;
  };
};

type StatsKey = "planets";

export const scrapeEsiPlanets = inngest.createFunction(
  {
    name: "Scrape Planets",
    concurrency: {
      limit: 1,
    },
    retries: 5,
  },
  { event: "scrape/esi/planets" },
  async ({ step, event }) => {
    const batchSize = event.data.batchSize ?? 1000;
    const planetIds: number[] = event.data.planetIds;

    if ((event.data.planetIds ?? []).length == 0)
      throw new NonRetriableError("Invalid planetIds");

    // Split IDs in batches
    const batches = await step.run("Fetch Solar System IDs", async () => {
      planetIds.sort((a, b) => a - b);

      const numBatches = Math.ceil(planetIds.length / batchSize);
      const batchIds = (batchIndex: number) =>
        planetIds.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);
      return [...Array(numBatches).keys()].map((batchId) => batchIds(batchId));
    });

    let results: BatchStepResult<StatsKey>[] = [];
    const limit = pLimit(20);

    const moons: { moonId: number; planetId: number }[] = [];

    for (let i = 0; i < batches.length; i++) {
      const result = await step.run(
        `Batch ${i + 1}/${batches.length}`,
        async (): Promise<BatchStepResult<StatsKey>> => {
          console.log(`starting batch ${i + 1}`);
          const stepStartTime = performance.now();
          const thisBatchIds = batches[i]!;

          const thisBatchPlanets = await Promise.all(
            thisBatchIds.map((planetId) =>
              limit(async () =>
                getUniversePlanetsPlanetId(planetId).then((res) => res.data),
              ),
            ),
          );

          const planetChanges = await updateTable({
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
                    excludeObjectKeys(entry, ["updatedAt"]),
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
);
