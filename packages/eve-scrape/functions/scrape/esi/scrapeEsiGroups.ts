import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import {
  getUniverseGroups,
  getUniverseGroupsGroupId,
} from "@jitaspace/esi-client-kubb";

import { inngest } from "../../../client";
import { BatchStepResult, CrudStatistics } from "../../../types";
import { excludeObjectKeys, updateTable } from "../../../utils";


export type ScrapeGroupsEventPayload = {
  data: {
    batchSize?: number;
  };
};
type StatsKey = "groups";

export const scrapeEsiGroups = inngest.createFunction(
  {
    name: "Scrape Groups",
    concurrency: {
      limit: 1,
    },
  },
  { event: "scrape/esi/groups" },
  async ({ step, event, logger }) => {
    const batchSize = event.data.batchSize ?? 500;

    // Get all Group IDs in ESI
    const batches = await step.run("Fetch Group IDs", async () => {
      const firstPage = await getUniverseGroups();
      const numPages = Number(firstPage.headers?.["x-pages"]);
      let groupIds = firstPage.data;
      for (let page = 2; page <= numPages; page++) {
        groupIds.push(
          ...(await getUniverseGroups({ page }).then((res) => res.data)),
        );
      }
      groupIds.sort((a, b) => a - b);

      const numBatches = Math.ceil(groupIds.length / batchSize);
      const batchIds = (batchIndex: number) =>
        groupIds.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);
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

          const groupChanges = await updateTable({
            fetchLocalEntries: async () =>
              prisma.group
                .findMany({
                  where: {
                    groupId: {
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
                thisBatchIds.map((groupId) =>
                  limit(async () =>
                    getUniverseGroupsGroupId(groupId)
                      .then((res) => res.data)
                      .then((group) => ({
                        groupId: group.group_id,
                        name: group.name,
                        categoryId: group.category_id,
                        published: group.published,
                        isDeleted: false,
                      })),
                  ),
                ),
              ),
            batchCreate: (entries) =>
              limit(() =>
                prisma.group.createMany({
                  data: entries,
                }),
              ),
            batchDelete: (entries) =>
              prisma.group.updateMany({
                data: {
                  isDeleted: true,
                },
                where: {
                  groupId: {
                    in: entries.map((group) => group.groupId),
                  },
                },
              }),
            batchUpdate: (entries) =>
              Promise.all(
                entries.map((entry) =>
                  limit(async () =>
                    prisma.group.update({
                      data: entry,
                      where: { groupId: entry.groupId },
                    }),
                  ),
                ),
              ),
            idAccessor: (e) => e.groupId,
          });

          return {
            stats: {
              groups: {
                created: groupChanges.created,
                deleted: groupChanges.deleted,
                modified: groupChanges.modified,
                equal: groupChanges.equal,
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
          groups: {
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
