import pLimit from "p-limit";

import { prisma, Type } from "@jitaspace/db";
import {
  getUniverseTypes,
  getUniverseTypesTypeId,
  GetUniverseTypesTypeId200,
} from "@jitaspace/esi-client";

import { inngest } from "../../../client";

export type ScrapeTypesPageEventPayload = {
  data: {
    page: number;
  };
};

export const scrapeEsiTypesPage = inngest.createFunction(
  { name: "Scrape Types Page" },
  { event: "scrape/esi/types-page" },
  async ({ event, logger }) => {
    // extract params
    const page: number = event.data.page;

    // Get all Type IDs in ESI;
    const firstPage = await getUniverseTypes();
    const numPages = firstPage.headers["x-pages"];
    if (page < 1 || page > numPages) throw new Error("Invalid page");
    const res = await getUniverseTypes({ page });
    const typeIds = res.data;
    logger.info(`going to fetch ${typeIds.length} entries from ESI`);

    // Get all Type details from ESI
    const fetchESIDetailsStartTime = performance.now();
    const limit = pLimit(20);
    const typesDetailsPromises = typeIds.map((typeId) =>
      limit(async () => getUniverseTypesTypeId(typeId)),
    );
    const typeResponses = await Promise.all(typesDetailsPromises);
    logger.info(
      `fetched ESI entries in ${performance.now() - fetchESIDetailsStartTime}`,
    );

    // extract bodies
    const types = typeResponses.map((res) => res.data);

    // determine which records to be created/updated/removed
    const existingIdsInDb = await prisma.type
      .findMany({
        select: {
          typeId: true,
        },
      })
      .then((types) => types.map((type) => type.typeId));

    const recordsToCreate = types.filter(
      (type) => !existingIdsInDb.includes(type.type_id),
    );
    const recordsToUpdate = types.filter((type) =>
      existingIdsInDb.includes(type.type_id),
    );
    const recordsToDelete = existingIdsInDb.filter(
      (typeId) => !typeIds.includes(typeId),
    );

    logger.info("records to create:", recordsToCreate.length);
    logger.info("records to update:", recordsToUpdate.length);
    logger.info("records to delete:", recordsToDelete.length);

    const fromEsiToSchema = (
      type: GetUniverseTypesTypeId200,
    ): Omit<Type, "updatedAt"> => ({
      typeId: type.type_id,
      iconId: type.icon_id ?? null,
      name: type.name,
      description: type.description,
      published: type.published,
      capacity: type.capacity ?? null,
      marketGroupId: type.market_group_id ?? null,
      graphicId: type.graphic_id ?? null,
      groupId: type.group_id,
      mass: type.mass ?? null,
      packagedVolume: type.packaged_volume ?? null,
      portionSize: type.portion_size ?? null,
      radius: type.radius ?? null,
      volume: type.volume ?? null,
      isDeleted: false,
    });

    // create missing records
    const createRecordsStartTime = performance.now();
    const createResult = await prisma.type.createMany({
      data: recordsToCreate.map(fromEsiToSchema),
      skipDuplicates: true,
    });
    logger.info(
      `created records in ${performance.now() - createRecordsStartTime}ms`,
    );

    // update all records with new data
    const updateRecordsStartTime = performance.now();
    const updateResult = await Promise.all(
      recordsToUpdate.map((type) =>
        limit(async () =>
          prisma.type.update({
            data: fromEsiToSchema(type),
            where: { typeId: type.type_id },
          }),
        ),
      ),
    );
    logger.info(
      `updated records in ${performance.now() - updateRecordsStartTime}ms`,
    );

    /*
    // mark records as deleted if missing from ESI
    const deleteRecordsStartTime = performance.now();
    const deleteResult = await prisma.type.updateMany({
      data: {
        isDeleted: true,
      },
      where: {
        typeId: {
          in: recordsToDelete,
        },
      },
    });
    logger.info(
      `deleted records in ${performance.now() - deleteRecordsStartTime}ms`,
    );*/

    return {
      numCreated: createResult.count,
      numUpdated: updateResult.length,
    };
  },
);
