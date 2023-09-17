import { MarketGroup, prisma } from "@jitaspace/db";
import {
  getMarketsGroups,
  getMarketsGroupsMarketGroupId,
  GetMarketsGroupsMarketGroupId200,
} from "@jitaspace/esi-client";

import { inngest } from "../../../client";

export type ScrapeMarketGroupsEventPayload = {
  data: {};
};

export const scrapeEsiMarketGroups = inngest.createFunction(
  { name: "Scrape Market Groups" },
  { event: "scrape/esi/market-groups" },
  async ({ event, step, logger }) => {
    // Get all Market Group IDs
    const { data: marketGroupIds } = await getMarketsGroups();
    logger.info(`going to fetch ${marketGroupIds.length} market groups...`);

    // Get all Market Group details from ESI
    const fetchESIDetailsStartTime = performance.now();
    const marketGroupsResponses = await Promise.all(
      marketGroupIds.map(async (marketGroupId) =>
        getMarketsGroupsMarketGroupId(marketGroupId),
      ),
    );
    logger.info(
      `fetched ESI market groups in ${
        performance.now() - fetchESIDetailsStartTime
      }ms`,
    );

    // extract body
    const marketGroups = marketGroupsResponses.map((res) => res.data);

    // determine which records to be created/updated/removed
    const existingIdsInDb = await prisma.marketGroup
      .findMany({
        select: {
          marketGroupId: true,
        },
      })
      .then((marketGroups) =>
        marketGroups.map((marketGroup) => marketGroup.marketGroupId),
      );

    const recordsToCreate = marketGroups.filter(
      (marketGroup) => !existingIdsInDb.includes(marketGroup.market_group_id),
    );
    const recordsToUpdate = marketGroups.filter((marketGroup) =>
      existingIdsInDb.includes(marketGroup.market_group_id),
    );
    const recordsToDelete = existingIdsInDb.filter(
      (marketGroupId) => !marketGroupIds.includes(marketGroupId),
    );

    logger.info("records to create:", recordsToCreate.length);
    logger.info("records to update:", recordsToUpdate.length);
    logger.info("records to delete:", recordsToDelete.length);

    const fromEsiToSchema = (
      marketGroup: GetMarketsGroupsMarketGroupId200,
    ): Omit<MarketGroup, "isDeleted" | "updatedAt"> => ({
      marketGroupId: marketGroup.market_group_id,
      name: marketGroup.name,
      parentMarketGroupId: null, //marketGroup.parent_group_id,
      description: marketGroup.description,
    });

    // create missing market groups
    const createRecordsStartTime = performance.now();
    const createResult = await prisma.marketGroup.createMany({
      data: recordsToCreate.map(fromEsiToSchema),
      skipDuplicates: true,
    });
    logger.info(
      `created records in ${performance.now() - createRecordsStartTime}ms`,
    );

    // update all market groups with new data
    const updateRecordsStartTime = performance.now();
    const updateResult = await Promise.all(
      recordsToUpdate.map((marketGroup) =>
        prisma.marketGroup.update({
          data: fromEsiToSchema(marketGroup),
          where: { marketGroupId: marketGroup.market_group_id },
        }),
      ),
    );
    logger.info(
      `updated records in ${performance.now() - updateRecordsStartTime}ms`,
    );

    // mark market groups as deleted if missing from ESI
    const deleteRecordsStartTime = performance.now();
    const deleteResult = await prisma.marketGroup.updateMany({
      data: {
        isDeleted: true,
      },
      where: {
        marketGroupId: {
          in: recordsToDelete,
        },
      },
    });

    return {
      numCreated: createResult.count,
      numUpdated: updateResult.length,
      numDeleted: deleteResult.count,
    };
  },
);
