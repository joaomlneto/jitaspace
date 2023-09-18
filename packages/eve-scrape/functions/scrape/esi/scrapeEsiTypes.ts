import pLimit from "p-limit";

import { prisma, Type } from "@jitaspace/db";
import {
  getUniverseTypes,
  getUniverseTypesTypeId,
  GetUniverseTypesTypeId200,
} from "@jitaspace/esi-client";

import { inngest } from "../../../client";

export type ScrapeTypesEventPayload = {
  data: {};
};

export const scrapeEsiTypes = inngest.createFunction(
  { name: "Scrape Types" },
  { event: "scrape/esi/types" },
  async ({ step, logger }) => {
    // Get all Type IDs in ESI
    const { numPages, allTypeIds } = await step.run(
      "Fetch number of pages and generate events",
      async () => {
        const firstPage = await getUniverseTypes();
        const numPages = Number(firstPage.headers["x-pages"]);
        let allTypeIds = firstPage.data;
        for (let page = 2; page <= numPages; page++) {
          allTypeIds.push(
            ...(await getUniverseTypes({ page }).then((res) => res.data)),
          );
        }
        return { numPages, allTypeIds };
      },
    );

    const numDeleted = await step.run(
      "Mark deleted types as such",
      async () => {
        return await prisma.type.updateMany({
          data: {
            isDeleted: true,
          },
          where: {
            typeId: {
              notIn: allTypeIds,
            },
          },
        });
      },
    );

    const BATCH_SIZE = 500;
    const numBatches = Math.ceil(allTypeIds.length / BATCH_SIZE);
    const limit = pLimit(10);

    // fetch all types in batches
    for (let i = 0; i < numBatches; i++) {
      await step.run(`Fetch types batch ${i + 1}/${numBatches}`, async () => {
        // Get page Types' details from ESI
        const typeIds = allTypeIds.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
        logger.info(`going to fetch ${typeIds.length} entries from ESI`);
        const fetchESIDetailsStartTime = performance.now();
        const typesDetailsPromises = typeIds.map((typeId) =>
          limit(async () => getUniverseTypesTypeId(typeId)),
        );
        const typeResponses = await Promise.all(typesDetailsPromises);
        logger.info(
          `fetched ESI entries in ${
            performance.now() - fetchESIDetailsStartTime
          }`,
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

        logger.info("records to create:", recordsToCreate.length);
        logger.info("records to update:", recordsToUpdate.length);

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
                data: { ...fromEsiToSchema(type) },
                where: { typeId: type.type_id },
              }),
            ),
          ),
        );
        logger.info(
          `updated records in ${performance.now() - updateRecordsStartTime}ms`,
        );

        // delete attributes that no longer exist
        const deleteAttributesStartTime = performance.now();
        const deleteAttributesResult = await Promise.all(
          types.map((type) =>
            limit(async () =>
              prisma.typeAttribute.updateMany({
                data: { isDeleted: true },
                where: {
                  typeId: type.type_id,
                  attributeId: {
                    notIn: (type.dogma_attributes ?? []).map(
                      (typeAttributes) => typeAttributes.attribute_id,
                    ),
                  },
                },
              }),
            ),
          ),
        );
        const numDeletedAttributes = deleteAttributesResult
          .map(({ count }) => count)
          .reduce((acc, cur) => acc + cur, 0);
        logger.info(
          `deleted type attributes in ${
            performance.now() - deleteAttributesStartTime
          }ms`,
        );

        // update type attributes with new information
        const updateAttributesStartTime = performance.now();
        const updateAttributesResult = await Promise.all(
          types.map((type) =>
            limit(async () =>
              Promise.all(
                (type.dogma_attributes ?? []).map((typeAttribute) => {
                  console.log("upsert", {
                    typeId: type.type_id,
                    attributeId: typeAttribute.attribute_id,
                    value: typeAttribute.value,
                  });
                  return prisma.typeAttribute.upsert({
                    update: {
                      value: typeAttribute.value,
                      isDeleted: false,
                    },
                    where: {
                      typeId_attributeId: {
                        typeId: type.type_id,
                        attributeId: typeAttribute.attribute_id,
                      },
                      typeId: type.type_id,
                      attributeId: typeAttribute.attribute_id,
                    },
                    create: {
                      typeId: type.type_id,
                      attributeId: typeAttribute.attribute_id,
                      value: typeAttribute.value,
                      isDeleted: false,
                    },
                  });
                }),
              ),
            ),
          ),
        );
        logger.info(
          `updated type attributes in ${
            performance.now() - updateAttributesStartTime
          }ms`,
        );
        const numUpdated = updateAttributesResult.reduce(
          (acc, arr) => acc + arr.length,
          0,
        );
        console.log({
          numUpdated,
        });

        return {
          numCreated: createResult.count,
          numUpdated,
          numDeletedAttributes,
        };
      });
    }

    return {
      numDeleted: numDeleted.count,
    };
  },
);
