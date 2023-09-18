import pLimit from "p-limit";

import { prisma, Type } from "@jitaspace/db";
import {
  getUniverseTypes,
  getUniverseTypesTypeId,
  GetUniverseTypesTypeId200,
} from "@jitaspace/esi-client";

import { inngest } from "../../../client";

export type ScrapeTypesEventPayload = {
  data: {
    batchSize?: number;
  };
};

export const scrapeEsiTypes = inngest.createFunction(
  { name: "Scrape Types" },
  { event: "scrape/esi/types" },
  async ({ step, event, logger }) => {
    const batchSize = event.data.batchSize ?? 100;

    // Get all Type IDs in ESI
    const typeIds = await step.run(
      "Fetch number of pages and generate events",
      async () => {
        const firstPage = await getUniverseTypes();
        const numPages = Number(firstPage.headers["x-pages"]);
        let typeIds = firstPage.data;
        for (let page = 2; page <= numPages; page++) {
          typeIds.push(
            ...(await getUniverseTypes({ page }).then((res) => res.data)),
          );
        }
        typeIds.sort((a, b) => a - b);
        return typeIds;
      },
    );

    await step.run("Mark deleted types as such", async () => {
      const result = await prisma.type.updateMany({
        data: {
          isDeleted: true,
        },
        where: {
          typeId: {
            notIn: typeIds,
          },
        },
      });

      return result;
    });

    const numBatches = Math.ceil(typeIds.length / batchSize);
    const limit = pLimit(20);
    const batchTypeIds = (batchIndex: number) =>
      typeIds.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);

    // fetch all types in batches
    for (let i = 0; i < numBatches; i++) {
      const thisBatchTypeIds = batchTypeIds(i);
      const thisBatchFirst = thisBatchTypeIds[0];
      const thisBatchLast = thisBatchTypeIds[thisBatchTypeIds.length - 1];
      const stepName = `Batch ${
        i + 1
      }/${numBatches}: typeIds [${thisBatchFirst} - ${thisBatchLast}]`;
      console.log("THIS BATCH TYPE IDs", thisBatchTypeIds);
      console.log("THIS BATCH TYPE IDs LENGTH", thisBatchTypeIds.length);
      await step.run(stepName, async () => {
        // Get page Types' details from ESI
        logger.info(
          `going to fetch ${thisBatchTypeIds.length} entries from ESI`,
        );
        const fetchESIDetailsStartTime = performance.now();
        const typesDetailsPromises = thisBatchTypeIds.map((typeId) =>
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

        /**
         * Deal with DogmaAttributes attached to the Type
         */

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
            Promise.all(
              (type.dogma_attributes ?? []).map((typeAttribute) =>
                limit(async () => {
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
        const numUpdatedAttributes = updateAttributesResult.reduce(
          (acc, arr) => acc + arr.length,
          0,
        );

        /**
         * Deal with DogmaEffects attached to the Type
         */

        // delete effects that no longer exist
        const deleteEffectsStartTime = performance.now();
        const deleteEffectsResult = await Promise.all(
          types.map((type) =>
            limit(async () =>
              prisma.typeEffect.updateMany({
                data: { isDeleted: true },
                where: {
                  typeId: type.type_id,
                  effectId: {
                    notIn: (type.dogma_effects ?? []).map(
                      (typeEffects) => typeEffects.effect_id,
                    ),
                  },
                },
              }),
            ),
          ),
        );
        const numDeletedEffects = deleteEffectsResult
          .map(({ count }) => count)
          .reduce((acc, cur) => acc + cur, 0);
        logger.info(
          `deleted type effects in ${
            performance.now() - deleteEffectsStartTime
          }ms`,
        );

        // update type effects with new information
        const updateEffectsStartTime = performance.now();
        const updateEffectsResult = await Promise.all(
          types.map((type) =>
            Promise.all(
              (type.dogma_effects ?? []).map((typeEffect) =>
                limit(async () => {
                  return prisma.typeEffect.upsert({
                    update: {
                      isDefault: typeEffect.is_default,
                      isDeleted: false,
                    },
                    where: {
                      typeId_effectId: {
                        typeId: type.type_id,
                        effectId: typeEffect.effect_id,
                      },
                      typeId: type.type_id,
                      effectId: typeEffect.effect_id,
                    },
                    create: {
                      typeId: type.type_id,
                      effectId: typeEffect.effect_id,
                      isDefault: typeEffect.is_default,
                      isDeleted: false,
                    },
                  });
                }),
              ),
            ),
          ),
        );
        logger.info(
          `updated type effects in ${
            performance.now() - updateEffectsStartTime
          }ms`,
        );
        const numUpdatedEffects = updateEffectsResult.reduce(
          (acc, arr) => acc + arr.length,
          0,
        );

        return {
          numTypesCreated: createResult.count,
          numTypesUpdated: updateResult.flat().length,
          numUpdatedAttributes,
          numDeletedAttributes,
          numUpdatedEffects,
          numDeletedEffects,
        };
      });
    }

    return {};
  },
);
