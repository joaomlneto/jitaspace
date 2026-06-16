import pLimit from "p-limit";

import { getUniverseMoonsMoonId } from "@jitaspace/esi-client";

import type { BatchStepResult, CrudStatistics } from "../../../types";
import { defineJob, NonRetriableError } from "../../../core";
import { prisma } from "../../../db";
import { excludeObjectKeys, updateTable } from "../../../utils";

export interface ScrapeMoonsEventPayload {
  data: {
    moons?: { moonId: number; planetId: number }[];
    batchSize?: number;
  };
}

type StatsKey = "moons";

// Extracted to keep the per-batch callbacks below from nesting too deeply.
const fetchRemoteMoon = (
  limit: ReturnType<typeof pLimit>,
  moon: { moonId: number; planetId: number },
) =>
  limit(async () =>
    getUniverseMoonsMoonId(moon.moonId)
      .then((res) => res.data)
      .then((esiMoon) => ({
        moonId: esiMoon.moon_id,
        name: esiMoon.name,
        planetId: moon.planetId,
        isDeleted: false,
      })),
  );

const updateMoon = (
  limit: ReturnType<typeof pLimit>,
  entry: { moonId: number; name: string; planetId: number; isDeleted: boolean },
) =>
  limit(async () =>
    prisma.moon.update({
      data: entry,
      where: { moonId: entry.moonId },
    }),
  );

export const scrapeEsiMoons = defineJob<ScrapeMoonsEventPayload["data"]>({
  id: "scrape-esi-moons",
  trigger: { type: "event" },
  name: "Scrape Moons",
  concurrencyLimit: 1,
  retries: 5,
  handler: async (ctx) => {
    const batchSize = ctx.payload.batchSize ?? 1000;
    const moonIds = ctx.payload.moons ?? [];

    if (moonIds.length == 0)
      throw new NonRetriableError("Invalid moonIds");

    // Split IDs in batches
    const batches = await ctx.run("Fetch Solar System IDs", () => {
      moonIds.sort((a, b) => a.moonId - b.moonId);

      const numBatches = Math.ceil(moonIds.length / batchSize);
      const batchIds = (batchIndex: number) =>
        moonIds.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);
      return Promise.resolve(
        [...new Array(numBatches).keys()].map((batchId) => batchIds(batchId)),
      );
    });

    const results: BatchStepResult<StatsKey>[] = [];
    const limit = pLimit(20);

    for (const [i, thisBatchMoons] of batches.entries()) {
      const result = await ctx.run(
        `Batch ${i + 1}/${batches.length}`,
        async (): Promise<BatchStepResult<StatsKey>> => {
          console.log(`starting batch ${i + 1}`);
          const stepStartTime = performance.now();
          const thisBatchMoonIds = thisBatchMoons.map((moon) => moon.moonId);

          const moonChanges = await updateTable({
            fetchLocalEntries: async () => {
              const entries = await prisma.moon.findMany({
                where: {
                  moonId: {
                    in: thisBatchMoonIds,
                  },
                },
              });
              return entries.map((entry) =>
                excludeObjectKeys(entry, ["updatedAt", "createdAt"]),
              );
            },
            fetchRemoteEntries: async () =>
              Promise.all(
                thisBatchMoons.map((moon) => fetchRemoteMoon(limit, moon)),
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
});
