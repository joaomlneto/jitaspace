import pLimit from "p-limit";

import {
  getUniverseGroups,
  getUniverseGroupsGroupId,
} from "@jitaspace/esi-client";

import type { Group } from "../../../db";
import type { BatchStepResult, CrudStatistics } from "../../../types";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { excludeObjectKeys, updateTable } from "../../../utils";

export interface ScrapeGroupsEventPayload {
  data: {
    batchSize?: number;
  };
}
type StatsKey = "groups";

type Limit = ReturnType<typeof pLimit>;

type GroupEntry = {
  groupId: number;
  name: string;
  categoryId: number;
  published: boolean;
  isDeleted: boolean;
};

const excludeGroupTimestamps = (entry: Group) =>
  excludeObjectKeys(entry, ["updatedAt", "createdAt"]);

const fetchRemoteGroup = (limit: Limit, groupId: number) =>
  limit(() =>
    getUniverseGroupsGroupId(groupId)
      .then((res) => res.data)
      .then((group) => ({
        groupId: group.group_id,
        name: group.name,
        categoryId: group.category_id,
        published: group.published,
        isDeleted: false,
      })),
  );

const updateGroup = (limit: Limit, entry: GroupEntry) =>
  limit(() =>
    prisma.group.update({
      data: entry,
      where: { groupId: entry.groupId },
    }),
  );

export const scrapeEsiGroups = defineJob<ScrapeGroupsEventPayload["data"]>({
  id: "scrape-esi-groups",
  name: "Scrape Groups",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  handler: async (ctx) => {
    const batchSize = ctx.payload.batchSize ?? 500;

    // Get all Group IDs in ESI
    const batches = await ctx.run("Fetch Group IDs", async () => {
      const firstPage = await getUniverseGroups();
      const numPages = Number(firstPage.headers?.["x-pages"]);
      const groupIds = firstPage.data;
      for (let page = 2; page <= numPages; page++) {
        groupIds.push(
          ...(await getUniverseGroups({ page }).then((res) => res.data)),
        );
      }
      groupIds.sort((a, b) => a - b);

      const numBatches = Math.ceil(groupIds.length / batchSize);
      const batchIds = (batchIndex: number) =>
        groupIds.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);
      return [...new Array(numBatches).keys()].map((batchId) =>
        batchIds(batchId),
      );
    });

    const results: BatchStepResult<StatsKey>[] = [];
    const limit = pLimit(20);

    // update records in batches
    for (let i = 0; i < batches.length; i++) {
      const result = await ctx.run(
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
                .then((entries) => entries.map(excludeGroupTimestamps)),
            fetchRemoteEntries: async () =>
              Promise.all(
                thisBatchIds.map((groupId) => fetchRemoteGroup(limit, groupId)),
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
              Promise.all(entries.map((entry) => updateGroup(limit, entry))),
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
  },
});
