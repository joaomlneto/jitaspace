import axios from "axios";
import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import {
  getMarketsGroups,
  getMarketsGroupsMarketGroupId,
} from "@jitaspace/esi-client";

import { client } from "../../../client";
import { BatchStepResult, CrudStatistics } from "../../../types";
import { excludeObjectKeys, updateTable } from "../../../utils";


export type ScrapeMarketGroupsEventPayload = {
  data: {
    batchSize?: number;
  };
};
type StatsKey = "marketGroups";

export const scrapeEsiMarketGroups = client.createFunction(
  {
    id: "scrape-esi-market-groups",
    name: "Scrape Market Groups",
    concurrency: {
      limit: 1,
    },
  },
  { event: "scrape/esi/market-groups" },
  async ({ step, event, logger }) => {
    // FIXME: THIS SHOULD NOT BE NECESSARY
    axios.defaults.baseURL = "https://esi.evetech.net/latest";
    const batchSize = event.data.batchSize ?? 500;

    // Get all Group IDs in ESI
    const batches = await step.run("Fetch Market Group IDs", async () => {
      const marketGroupIds = await getMarketsGroups().then((res) => res.data);
      marketGroupIds.sort((a, b) => a - b);

      const numBatches = Math.ceil(marketGroupIds.length / batchSize);
      const batchIds = (batchIndex: number) =>
        marketGroupIds.slice(
          batchIndex * batchSize,
          (batchIndex + 1) * batchSize,
        );
      return [...Array(numBatches).keys()].map((batchId) => batchIds(batchId));
    });

    let results: BatchStepResult<StatsKey>[] = [];
    const limit = pLimit(20);

    // update records in batches
    for (let i = 0; i < batches.length; i++) {
      const result = await step.run(
        `Batch ${i + 1}/${batches.length}`,
        async (): Promise<BatchStepResult<StatsKey>> => {
          const stepStartTime = performance.now();
          const thisBatchIds = batches[i]!;

          const marketGroupChanges = await updateTable({
            fetchLocalEntries: async () =>
              prisma.marketGroup
                .findMany({
                  where: {
                    marketGroupId: {
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
                thisBatchIds.map((marketGroupId) =>
                  limit(async () =>
                    getMarketsGroupsMarketGroupId(marketGroupId)
                      .then((res) => res.data)
                      .then((marketGroup) => ({
                        marketGroupId: marketGroup.market_group_id,
                        name: marketGroup.name,
                        parentMarketGroupId:
                          marketGroup.parent_group_id ?? null,
                        description: marketGroup.description,
                        isDeleted: false,
                      })),
                  ),
                ),
              ),
            batchCreate: (entries) =>
              limit(() =>
                prisma.marketGroup.createMany({
                  data: entries,
                }),
              ),
            batchDelete: (entries) =>
              prisma.marketGroup.updateMany({
                data: {
                  isDeleted: true,
                },
                where: {
                  marketGroupId: {
                    in: entries.map((entry) => entry.marketGroupId),
                  },
                },
              }),
            batchUpdate: (entries) =>
              Promise.all(
                entries.map((entry) =>
                  limit(async () =>
                    prisma.marketGroup.update({
                      data: entry,
                      where: { marketGroupId: entry.marketGroupId },
                    }),
                  ),
                ),
              ),
            idAccessor: (e) => e.marketGroupId,
          });

          return {
            stats: {
              marketGroups: {
                created: marketGroupChanges.created,
                deleted: marketGroupChanges.deleted,
                modified: marketGroupChanges.modified,
                equal: marketGroupChanges.equal,
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
          marketGroups: {
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
