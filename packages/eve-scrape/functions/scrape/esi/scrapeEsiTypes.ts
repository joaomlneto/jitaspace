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

const recordsAreEqual = <T>(a: T, b: T) =>
  // @ts-expect-error indexing objects dangerously, but responsibly
  Object.keys(a).every((key) => a[key] == b[key]);

// Stolen from Prisma:
// see https://www.prisma.io/docs/concepts/components/prisma-client/excluding-fields
function excludeObjectKeys<T extends object, Key extends keyof T>(
  record: T,
  keys: Key[],
): Omit<T, Key> {
  // @ts-expect-error idk why
  return Object.fromEntries(
    // @ts-expect-error idk why
    Object.entries(record).filter(([key]) => !keys.includes(key)),
  );
}

export const compareSets = <T, Key extends keyof T>({
  recordsBefore,
  recordsAfter,
  getId,
  recordsAreEqual,
}: {
  recordsBefore: T[];
  recordsAfter: T[];
  getId: (t: T) => string | number;
  recordsAreEqual: (a: T, b: T) => boolean;
}) => {
  const keysBefore = recordsBefore.map((record) => getId(record));
  const keysAfter = recordsAfter.map((record) => getId(record));

  const indexBefore: {
    [key: string | number | symbol]: T;
  } = {};
  recordsBefore.forEach((record) => (indexBefore[getId(record)] = record));

  const indexAfter: {
    [key: string | number | symbol]: T;
  } = {};
  recordsAfter.forEach((record) => (indexAfter[getId(record)] = record));

  // determine which records were created
  const created: T[] = recordsAfter.filter(
    (record) => !keysBefore.includes(getId(record)),
  );

  // determine which records were deleted
  const deleted = recordsBefore.filter(
    (record) => !keysAfter.includes(getId(record)),
  );

  // get the records that are common to both sets
  const commonKeys = keysAfter.filter((key) => keysBefore.includes(key));
  const commonRecordPairs = commonKeys.map((key) => ({
    recordBefore: indexBefore[key]!,
    recordAfter: indexAfter[key]!,
  }));

  // determine which records did not change
  const equal = commonRecordPairs
    .filter(({ recordBefore, recordAfter }) =>
      recordsAreEqual(recordBefore, recordAfter),
    )
    .map(({ recordBefore, recordAfter }) => recordAfter);
  const equalKeys = equal.map((record) => getId(record));

  // determine which records have been modified
  const modified = recordsAfter.filter(
    (record) => !equalKeys.includes(getId(record)),
  );

  return { created, deleted, equal, modified };
};

export const scrapeEsiTypes = inngest.createFunction(
  { name: "Scrape Types" },
  { event: "scrape/esi/types" },
  async ({ step, event, logger }) => {
    const batchSize = event.data.batchSize ?? 100;

    // Get all Type IDs in ESI
    const typeIds = await step.run("Fetch Type IDs", async () => {
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
    });

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
              notIn: typeChanges.deleted.map((type) => type.typeId),
            },
          },
        });

        /**
         * Deal with DogmaAttributes attached to the Type
         */
        const existingTypeAttributesInDb = await prisma.typeAttribute.findMany({
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
          elapsed: performance.now() - fetchESIDetailsStartTime,
        };
      });
    }

    return {};
  },
);
