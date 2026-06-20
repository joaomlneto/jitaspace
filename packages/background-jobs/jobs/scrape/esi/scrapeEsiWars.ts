import { getWars } from "@jitaspace/esi-client";

import type { BatchStepResult, CrudStatistics } from "../../../types";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { createCorpAndItsRefRecords } from "../../../helpers/createCorpAndItsRefs.ts";

export interface ScrapeWarsEventPayload {
  data: {
    batchSize?: number;
    /**
     * Whether to fetch all pages of wars. If set to true, it will fetch all
     * wars in one go, which is ideal for bootstrapping a new database.
     * For regular updates, it is recommended to set this to false (default).
     */
    fetchAllPages?: boolean;
    /**
     * Maximum war ID to fetch. If not provided, it will fetch all wars.
     */
    maxWarId?: number;
    /**
     * Whether to skip updating existing wars in the database.
     */
    skipExisting?: boolean;
    /**
     * Whether to skip wars that are already finished.
     * True by default. Wars that are finished are read-only and
     * should not be updated.
     */
    skipFinished?: boolean;
  };
}

type StatsKey = "wars";

export const scrapeEsiWars = defineJob<ScrapeWarsEventPayload["data"]>({
  id: "scrape-esi-wars",
  name: "Scrape Wars",
  trigger: { type: "event" },
  singleton: true,
  retries: 0,
  description: "Fetches wars from ESI",
  handler: async (ctx) => {
    const batchSize = ctx.payload.batchSize ?? 100;
    const fetchAllPages = ctx.payload.fetchAllPages ?? false;
    const maxWarId = ctx.payload.maxWarId;
    const skipExisting = ctx.payload.skipExisting ?? false;
    const skipFinished = ctx.payload.skipFinished ?? true;

    // Get all War IDs in ESI
    const batches = await ctx.run("Fetch War IDs", async () => {
      const warIds = await getWars({ max_war_id: maxWarId }).then(
        (res) => res.data,
      );

      // find which ones are already in the database and are finished
      const existingWars = skipExisting
        ? await prisma.war.findMany({
            select: { warId: true, finishedDate: true },
            where: {
              warId: {
                in: warIds,
              },
            },
          })
        : [];

      const remainingWarIds = warIds.filter(
        (warId) =>
          !existingWars.some((war) => war.warId === warId) &&
          (!skipFinished ||
            !existingWars.some(
              (war) => war.warId === warId && war.finishedDate !== null,
            )),
      );

      remainingWarIds.sort((a, b) => a - b);
      const numBatches = Math.ceil(remainingWarIds.length / batchSize);
      const batchTypeIds = (batchIndex: number) =>
        remainingWarIds.slice(
          batchIndex * batchSize,
          (batchIndex + 1) * batchSize,
        );
      return [...new Array(numBatches).keys()].map((batchId) =>
        batchTypeIds(batchId),
      );
    });

    const results: BatchStepResult<StatsKey>[] = [];

    // update types in batches
    for (const [i, thisBatchWarIds] of batches.entries()) {
      const result = await ctx.run(
        `Batch ${i + 1}/${batches.length}`,
        async (): Promise<BatchStepResult<StatsKey>> => {
          const stepStartTime = performance.now();

          await createCorpAndItsRefRecords({
            missingWarIds: new Set(thisBatchWarIds),
          });

          return {
            stats: {
              wars: {
                created: 0,
                deleted: 0,
                modified: 0,
                equal: 0,
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
        wars: {
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

    // Check if we need to recurse to fetch all pages
    if (fetchAllPages) {
      const nextMaxWarId = Math.min(...batches.flat());
      // Fire-and-forget self-recursion to fetch the next (older) page.
      await ctx.send("scrape-esi-wars", {
        maxWarId: nextMaxWarId,
        fetchAllPages: true,
      });
    }

    return totals;
  },
});
