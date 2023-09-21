import pLimit from "p-limit";

import { prisma, Type } from "@jitaspace/db";
import {
  getUniverseTypes,
  getUniverseTypesTypeId,
  GetUniverseTypesTypeId200,
} from "@jitaspace/esi-client";

import { inngest } from "../../../client";
import { BatchStepResult, CrudStatistics } from "../../../types";
import {
  compareSets,
  excludeObjectKeys,
  recordsAreEqual,
} from "../../../utils";

export type ScrapeTypesEventPayload = {
  data: {
    batchSize?: number;
  };
};

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

type StatsKey = "types" | "typeAttributes" | "typeEffects";

export const scrapeEsiTypes = inngest.createFunction(
  { name: "Scrape Types" },
  { event: "scrape/esi/types" },
  async ({ step, event, logger }) => {
    const batchSize = event.data.batchSize ?? 100;

    // Get all Type IDs in ESI
    const batches = await step.run("Fetch Type IDs", async () => {
      const firstPage = await getUniverseTypes();
      const numPages = Number(firstPage.headers["x-pages"]);
      let typeIds = firstPage.data;
      for (let page = 2; page <= numPages; page++) {
        typeIds.push(
          ...(await getUniverseTypes({ page }).then((res) => res.data)),
        );
      }
      typeIds.sort((a, b) => a - b);

      const numBatches = 2; //Math.ceil(typeIds.length / batchSize); //FIXME
      const batchTypeIds = (batchIndex: number) =>
        typeIds.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);
      const batches = [...Array(numBatches).keys()].map((batchId) =>
        batchTypeIds(batchId),
      );

      return batches;
    });

    let results: BatchStepResult<StatsKey>[] = [];

    // fetch all types in batches
    for (let i = 0; i < batches.length; i++) {
      const result = await step.run(
        `Batch ${i + 1}/${batches.length}`,
        async (): Promise<BatchStepResult<StatsKey>> => {
          const limit = pLimit(20);
          const thisBatchTypeIds = batches[i]!;
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
          const types = typeResponses.map((res) => res.data);
          const convertedTypes = types.map((type) => fromEsiToSchema(type));

          // determine which records to be created/updated/removed
          // first, get the relevant records from the database
          const existingRecordsInDb = await prisma.type.findMany({
            where: {
              typeId: {
                in: thisBatchTypeIds,
              },
            },
          });

          const typeChanges = compareSets({
            recordsBefore: existingRecordsInDb.map((record) =>
              excludeObjectKeys(record, ["updatedAt"]),
            ),
            recordsAfter: convertedTypes,
            getId: (t) => t.typeId,
            recordsAreEqual,
          });
          const createResult = await prisma.type.createMany({
            data: typeChanges.created,
          });
          const updateResult = await Promise.all(
            typeChanges.modified.map((type) =>
              limit(async () =>
                prisma.type.update({
                  data: type,
                  where: { typeId: type.typeId },
                }),
              ),
            ),
          );
          const deleteResult = await prisma.type.updateMany({
            data: {
              isDeleted: true,
            },
            where: {
              typeId: {
                in: typeChanges.deleted.map((type) => type.typeId),
              },
            },
          });

          /**
           * Deal with DogmaAttributes attached to the Type
           */
          const existingTypeAttributesInDb =
            await prisma.typeAttribute.findMany({
              where: {
                typeId: {
                  in: thisBatchTypeIds,
                },
              },
            });
          const typeAttributesChanges = compareSets({
            recordsBefore: existingTypeAttributesInDb.map((record) =>
              excludeObjectKeys(record, ["updatedAt", "isDeleted"]),
            ),
            recordsAfter: types.flatMap((type) =>
              (type.dogma_attributes ?? []).map((typeAttribute) => ({
                attributeId: typeAttribute.attribute_id,
                typeId: type.type_id,
                value: typeAttribute.value,
              })),
            ),
            getId: (t) => `${t.typeId}:${t.attributeId}`,
            recordsAreEqual,
          });
          // XXX: We cannot batch these updates because we have a composite ID on this table
          const deleteAttributesResult = await Promise.all(
            typeAttributesChanges.deleted.map((typeAttribute) =>
              limit(async () =>
                prisma.typeAttribute.update({
                  data: { isDeleted: true },
                  where: {
                    typeId_attributeId: {
                      typeId: typeAttribute.typeId,
                      attributeId: typeAttribute.attributeId,
                    },
                  },
                }),
              ),
            ),
          );

          // update type attributes with new information
          const updateAttributesResult = await Promise.all(
            typeAttributesChanges.modified.map((typeAttribute) =>
              limit(async () =>
                prisma.typeAttribute.update({
                  data: typeAttribute,
                  where: {
                    typeId_attributeId: {
                      typeId: typeAttribute.typeId,
                      attributeId: typeAttribute.attributeId,
                    },
                  },
                }),
              ),
            ),
          );

          /**
           * Deal with DogmaEffects attached to the Type
           */
          const existingTypeEffectsInDb = await prisma.typeEffect.findMany({
            where: {
              typeId: {
                in: thisBatchTypeIds,
              },
            },
          });
          const typeEffectsChanges = compareSets({
            recordsBefore: existingTypeEffectsInDb.map((record) =>
              excludeObjectKeys(record, ["updatedAt", "isDeleted"]),
            ),
            recordsAfter: types.flatMap((type) =>
              (type.dogma_effects ?? []).map((typeAttribute) => ({
                effectId: typeAttribute.effect_id,
                typeId: type.type_id,
                isDefault: typeAttribute.is_default,
              })),
            ),
            getId: (t) => `${t.typeId}:${t.effectId}`,
            recordsAreEqual,
          });
          // delete effects that no longer exist
          const deleteEffectsResult = await Promise.all(
            typeEffectsChanges.deleted.map((typeEffect) =>
              limit(async () =>
                prisma.typeEffect.update({
                  data: { isDeleted: true },
                  where: {
                    typeId_effectId: {
                      typeId: typeEffect.typeId,
                      effectId: typeEffect.effectId,
                    },
                  },
                }),
              ),
            ),
          );

          // update type effects with new information
          const updateEffectsResult = await Promise.all(
            typeEffectsChanges.modified.map((typeEffect) =>
              limit(async () =>
                prisma.typeEffect.update({
                  data: typeEffect,
                  where: {
                    typeId_effectId: {
                      typeId: typeEffect.typeId,
                      effectId: typeEffect.effectId,
                    },
                  },
                }),
              ),
            ),
          );

          return {
            stats: {
              types: {
                created: typeChanges.created.length,
                deleted: typeChanges.deleted.length,
                modified: typeChanges.modified.length,
                equal: typeChanges.equal.length,
              },
              typeAttributes: {
                created: typeAttributesChanges.created.length,
                deleted: typeAttributesChanges.deleted.length,
                modified: typeAttributesChanges.modified.length,
                equal: typeAttributesChanges.equal.length,
              },
              typeEffects: {
                created: typeEffectsChanges.created.length,
                deleted: typeEffectsChanges.deleted.length,
                modified: typeEffectsChanges.modified.length,
                equal: typeEffectsChanges.equal.length,
              },
            },
            elapsed: performance.now() - fetchESIDetailsStartTime,
          };
        },
      );
      results.push(result);
    }

    const totals = await step.run("Compute Aggregates", async () => {
      let totals: BatchStepResult<StatsKey> = {
        stats: {
          types: {
            created: 0,
            deleted: 0,
            modified: 0,
            equal: 0,
          },
          typeAttributes: {
            created: 0,
            deleted: 0,
            modified: 0,
            equal: 0,
          },
          typeEffects: {
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

    return totals;
  },
);
