import pLimit from "p-limit";

import { Group, prisma } from "@jitaspace/db";
import {
  getUniverseGroups,
  getUniverseGroupsGroupId,
  GetUniverseGroupsGroupId200,
} from "@jitaspace/esi-client";

import { inngest } from "../../../client";

export type ScrapeGroupsEventPayload = {
  data: {};
};

export const scrapeEsiGroups = inngest.createFunction(
  { name: "Scrape Groups" },
  { event: "scrape/esi/groups" },
  async ({ logger }) => {
    // Get all Group IDs in ESI
    const firstPage = await getUniverseGroups();
    let groupIds = firstPage.data;
    const numPages = firstPage.headers["x-pages"];
    for (let page = 2; page <= numPages; page++) {
      const result = await getUniverseGroups({ page });
      groupIds.push(...result.data);
    }
    logger.info(`going to fetch ${groupIds.length} groupIds`);

    // Get all Group details from ESI
    const fetchESIDetailsStartTime = performance.now();
    const limit = pLimit(20);
    const groupsDetailsPromises = groupIds.map((groupId) =>
      limit(async () => getUniverseGroupsGroupId(groupId)),
    );
    const groupsResponses = await Promise.all(groupsDetailsPromises);
    logger.info(
      `fetched ESI entries in ${performance.now() - fetchESIDetailsStartTime}`,
    );

    // extract bodies
    const groups = groupsResponses.map((res) => res.data);

    // determine which records to be created/updated/removed
    const existingIdsInDb = await prisma.group
      .findMany({
        select: {
          groupId: true,
        },
      })
      .then((groups) => groups.map((group) => group.groupId));

    const recordsToCreate = groups.filter(
      (group) => !existingIdsInDb.includes(group.group_id),
    );
    const recordsToUpdate = groups.filter((group) =>
      existingIdsInDb.includes(group.group_id),
    );
    const recordsToDelete = existingIdsInDb.filter(
      (groupId) => !groupIds.includes(groupId),
    );

    logger.info("records to create:", recordsToCreate.length);
    logger.info("records to update:", recordsToUpdate.length);
    logger.info("records to delete:", recordsToDelete.length);

    const fromEsiToSchema = (
      group: GetUniverseGroupsGroupId200,
    ): Omit<Group, "updatedAt"> => ({
      groupId: group.group_id,
      name: group.name,
      categoryId: group.category_id,
      published: group.published,
      isDeleted: false,
    });

    // create missing rows
    const createRecordsStartTime = performance.now();
    const createResult = await prisma.group.createMany({
      data: recordsToCreate.map(fromEsiToSchema),
      skipDuplicates: true,
    });
    logger.info(
      `created records in ${performance.now() - createRecordsStartTime}ms`,
    );

    // update all rows with new data
    /*

    const groupsDetailsPromises = groupIds.map((groupId) =>
      limit(async () => getUniverseGroupsGroupId(groupId)),
    );
       */
    const updateRecordsStartTime = performance.now();
    const updateResult = await Promise.all(
      recordsToUpdate.map((group) =>
        limit(async () =>
          prisma.group.update({
            data: fromEsiToSchema(group),
            where: { groupId: group.group_id },
          }),
        ),
      ),
    );
    logger.info(
      `updated records in ${performance.now() - updateRecordsStartTime}ms`,
    );

    // mark rows as deleted if missing from ESI
    const deleteRecordsStartTime = performance.now();
    const deleteResult = await prisma.group.updateMany({
      data: {
        isDeleted: true,
      },
      where: {
        groupId: {
          in: recordsToDelete,
        },
      },
    });
    logger.info(
      `deleted records in ${performance.now() - deleteRecordsStartTime}ms`,
    );

    return {
      numCreated: createResult.count,
      numUpdated: updateResult.length,
      numDeleted: deleteResult.count,
    };
  },
);
