import { NonRetriableError } from "inngest";
import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import {
  getMarketsGroups,
  getMarketsGroupsMarketGroupId,
} from "@jitaspace/esi-client";

import { client } from "../../../client";
import { excludeObjectKeys, updateTable } from "../../../utils";


export type ScrapeMarketGroupsEventPayload = {
  data: {
    batchSize?: number;
  };
};

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
    const batchSize = event.data.batchSize ?? 500;

    // Get all Market Group IDs in ESI
    const marketGroupIds = await getMarketsGroups().then((res) => res.data);
    marketGroupIds.sort((a, b) => a - b);
    const limit = pLimit(20);
    const stepStartTime = performance.now();

    const localEntries = await prisma.marketGroup
      .findMany({
        where: {
          marketGroupId: {
            in: marketGroupIds,
          },
        },
      })
      .then((entries) =>
        entries.map((entry) => excludeObjectKeys(entry, ["updatedAt"])),
      );

    const marketGroupIdsInDatabase = localEntries.map(
      (entry) => entry.marketGroupId,
    );

    const marketGroupChanges = await updateTable({
      fetchLocalEntries: async () => localEntries,
      fetchRemoteEntries: async () =>
        Promise.all(
          marketGroupIds.map((marketGroupId) =>
            limit(async () =>
              getMarketsGroupsMarketGroupId(marketGroupId)
                .then((res) => res.data)
                .then((marketGroup) => ({
                  marketGroupId: marketGroup.market_group_id,
                  name: marketGroup.name,
                  parentMarketGroupId: marketGroup.parent_group_id ?? null,
                  description: marketGroup.description,
                  isDeleted: false,
                })),
            ),
          ),
        ),
      batchCreate: async (entries) => {
        let missingEntries = entries;

        while (missingEntries.length > 0) {
          const creatableEntries = missingEntries.filter(
            (entry) =>
              entry.parentMarketGroupId == null ||
              marketGroupIdsInDatabase.includes(entry.parentMarketGroupId),
          );

          if (creatableEntries.length == 0) {
            throw new NonRetriableError(
              "Entries are missing but none can be created!",
            );
          }

          const nonCreatableEntries = missingEntries.filter(
            (entry) =>
              entry.parentMarketGroupId != null &&
              !marketGroupIdsInDatabase.includes(entry.parentMarketGroupId),
          );

          // sanity check
          if (
            missingEntries.length !=
            creatableEntries.length + nonCreatableEntries.length
          ) {
            throw new NonRetriableError(
              "Partitioning went wrong! Two plus two is no longer four.",
            );
          }

          // create the missing entries!
          await limit(() =>
            prisma.marketGroup.createMany({
              data: creatableEntries,
            }),
          );

          missingEntries = nonCreatableEntries;
          marketGroupIdsInDatabase.push(
            ...creatableEntries.map((entry) => entry.marketGroupId),
          );
        }
      },
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

    await step.sendEvent("Function Finished", {
      name: "scrape/esi/market-groups.finished",
      data: {},
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
