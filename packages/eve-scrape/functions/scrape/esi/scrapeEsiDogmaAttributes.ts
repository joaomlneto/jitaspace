import pLimit from "p-limit";

import { DogmaAttribute, prisma } from "@jitaspace/db";
import {
  getDogmaAttributes,
  getDogmaAttributesAttributeId,
  GetDogmaAttributesAttributeId200,
} from "@jitaspace/esi-client";

import { inngest } from "../../../client";

export type ScrapeDogmaAttributesEventPayload = {
  data: {};
};

export const scrapeEsiDogmaAttributes = inngest.createFunction(
  { name: "Scrape Dogma Attributes" },
  { event: "scrape/esi/dogma-attributes" },
  async ({ logger }) => {
    // Get all Dogma Attribute IDs in ESI
    const { data: dogmaAttributeIds } = await getDogmaAttributes();
    logger.info(`going to fetch ${dogmaAttributeIds.length} entries from ESI`);

    // Get all Dogma Attribute details from ESI
    const fetchESIDetailsStartTime = performance.now();
    const limit = pLimit(20);
    const domaAttributesDetailsPromises = dogmaAttributeIds.map(
      (dogmaAttributeId) =>
        limit(async () => getDogmaAttributesAttributeId(dogmaAttributeId)),
    );
    const domaAttributesResponses = await Promise.all(
      domaAttributesDetailsPromises,
    );
    logger.info(
      `fetched ESI entries in ${performance.now() - fetchESIDetailsStartTime}`,
    );

    // extract bodies
    const dogmaAttributes = domaAttributesResponses.map((res) => res.data);

    // determine which records to be created/updated/removed
    const existingIdsInDb = await prisma.dogmaAttribute
      .findMany({
        select: {
          attributeId: true,
        },
      })
      .then((dogmaAttributes) =>
        dogmaAttributes.map((dogmaAttribute) => dogmaAttribute.attributeId),
      );

    const recordsToCreate = dogmaAttributes.filter(
      (dogmaAttribute) =>
        !existingIdsInDb.includes(dogmaAttribute.attribute_id),
    );
    const recordsToUpdate = dogmaAttributes.filter((dogmaAttribute) =>
      existingIdsInDb.includes(dogmaAttribute.attribute_id),
    );
    const recordsToDelete = existingIdsInDb.filter(
      (dogmaAttributeId) => !dogmaAttributeIds.includes(dogmaAttributeId),
    );

    logger.info("records to create:", recordsToCreate.length);
    logger.info("records to update:", recordsToUpdate.length);
    logger.info("records to delete:", recordsToDelete.length);

    const fromEsiToSchema = (
      dogmaAttribute: GetDogmaAttributesAttributeId200,
    ): Omit<DogmaAttribute, "updatedAt"> => ({
      attributeId: dogmaAttribute.attribute_id,
      name: dogmaAttribute.name ?? null,
      published: dogmaAttribute.published ?? null,
      description: dogmaAttribute.description ?? null,
      defaultValue: dogmaAttribute.default_value ?? null,
      displayName: dogmaAttribute.display_name ?? null,
      highIsGood: dogmaAttribute.high_is_good ?? null,
      iconId: dogmaAttribute.icon_id ?? null,
      stackable: dogmaAttribute.stackable ?? null,
      unitId: dogmaAttribute.unit_id ?? null,
      isDeleted: false,
    });

    // create missing records
    const createRecordsStartTime = performance.now();
    const createResult = await prisma.dogmaAttribute.createMany({
      data: recordsToCreate.map(fromEsiToSchema),
      skipDuplicates: true,
    });
    logger.info(
      `created records in ${performance.now() - createRecordsStartTime}ms`,
    );

    // update all records with new data
    const updateRecordsStartTime = performance.now();
    const updateResult = await Promise.all(
      recordsToUpdate.map((dogmaAttribute) =>
        limit(async () =>
          prisma.dogmaAttribute.update({
            data: fromEsiToSchema(dogmaAttribute),
            where: { attributeId: dogmaAttribute.attribute_id },
          }),
        ),
      ),
    );
    logger.info(
      `updated records in ${performance.now() - updateRecordsStartTime}ms`,
    );

    // mark records as deleted if missing from ESI
    const deleteRecordsStartTime = performance.now();
    const deleteResult = await prisma.dogmaAttribute.updateMany({
      data: {
        isDeleted: true,
      },
      where: {
        attributeId: {
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
