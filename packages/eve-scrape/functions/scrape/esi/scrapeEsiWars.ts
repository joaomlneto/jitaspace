import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import { getWars, getWarsWarId } from "@jitaspace/esi-client";

import { client } from "../../../client";
import { createCorpAndItsRefRecords } from "../../../helpers/createCorpAndItsRefs.ts";
import { BatchStepResult, CrudStatistics } from "../../../types";
import { excludeObjectKeys, updateTable } from "../../../utils";

export type ScrapeWarsEventPayload = {
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
};

type StatsKey = "wars";

export const scrapeEsiWars = client.createFunction(
  {
    id: "scrape-esi-wars",
    name: "Scrape Wars",
    singleton: {
      key: "scrape-esi-wars",
      mode: "skip",
    },
    retries: 0,
    description: "Fetches wars from ESI",
  },
  { event: "scrape/esi/wars" },
  async ({ step, event, logger }) => {
    const batchSize = event.data.batchSize ?? 100;
    const fetchAllPages = event.data.fetchAllPages ?? false;
    const maxWarId = event.data.maxWarId;
    const skipExisting = event.data.skipExisting ?? false;
    const skipFinished = event.data.skipFinished ?? true;

    // Get all War IDs in ESI
    const batches = await step.run("Fetch War IDs", async () => {
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
      return [...Array(numBatches).keys()].map((batchId) =>
        batchTypeIds(batchId),
      );
    });

    let results: BatchStepResult<StatsKey>[] = [];
    const limit = pLimit(1);

    // update types in batches
    for (let i = 0; i < batches.length; i++) {
      const result = await step.run(
        `Batch ${i + 1}/${batches.length}`,
        async (): Promise<BatchStepResult<StatsKey>> => {
          const stepStartTime = performance.now();
          const thisBatchWarIds = batches[i]!;

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
      await step.sendEvent(`Scrape Wars < ${nextMaxWarId}`, {
        name: "scrape/esi/wars",
        data: {
          maxWarId: nextMaxWarId,
          fetchAllPages: true, // Continue fetching all pages
        },
      });
    }

    await step.sendEvent("Function Finished", {
      name: "scrape/esi/wars.finished",
      data: {},
    });

    return totals;
  },
);
