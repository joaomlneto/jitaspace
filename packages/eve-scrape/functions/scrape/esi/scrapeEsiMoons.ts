import axios from "axios";
import { NonRetriableError } from "inngest";
import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import { getUniverseMoonsMoonId } from "@jitaspace/esi-client-kubb";

import { inngest } from "../../../client";
import { BatchStepResult, CrudStatistics } from "../../../types";
import { excludeObjectKeys, updateTable } from "../../../utils";

export type ScrapeMoonsEventPayload = {
  data: {
    moons: { moonId: number; planetId: number }[];
    batchSize?: number;
  };
};

type StatsKey = "moons";

export const scrapeEsiMoons = inngest.createFunction(
  {
    name: "Scrape Moons",
    concurrency: {
      limit: 1,
    },
    retries: 5,
  },
  { event: "scrape/esi/moons" },
  async ({ step, event }) => {
    const batchSize = event.data.batchSize ?? 1000;
    const moonIds = event.data.moons;

    if ((event.data.moons ?? []).length == 0)
      throw new NonRetriableError("Invalid moonIds");

    // Split IDs in batches
    const batches = await step.run("Fetch Solar System IDs", async () => {
      moonIds.sort((a, b) => a.moonId - b.moonId);

      const numBatches = Math.ceil(moonIds.length / batchSize);
      const batchIds = (batchIndex: number) =>
        moonIds.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);
      return [...Array(numBatches).keys()].map((batchId) => batchIds(batchId));
    });

    let results: BatchStepResult<StatsKey>[] = [];
    const limit = pLimit(20);

    for (let i = 0; i < batches.length; i++) {
      const result = await step.run(
        `Batch ${i + 1}/${batches.length}`,
        async (): Promise<BatchStepResult<StatsKey>> => {
          console.log(`starting batch ${i + 1}`);
          const stepStartTime = performance.now();
          const thisBatchMoons = batches[i]!;
          const thisBatchMoonIds = thisBatchMoons.map((moon) => moon.moonId);

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
                thisBatchMoons.map((moon) =>
                  limit(async () =>
                    getUniverseMoonsMoonId(moon.moonId)
                      .then((res) => res.data)
                      .then((esiMoon) => ({
                        moonId: esiMoon.moon_id,
                        name: esiMoon.name,
                        planetId: moon.planetId,
                        isDeleted: false,
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

          return {
            stats: {
              moons: {
                created: moonChanges.created,
                deleted: moonChanges.deleted,
                modified: moonChanges.modified,
                equal: moonChanges.equal,
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
        moons: {
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
