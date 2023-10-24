import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import {
  getUniverseTypes,
  getUniverseTypesTypeId,
} from "@jitaspace/esi-client";

import { client } from "../../../client";
import { BatchStepResult, CrudStatistics } from "../../../types";
import { excludeObjectKeys, updateTable } from "../../../utils";


export type ScrapeTypesEventPayload = {
  data: {
    batchSize?: number;
  };
};

type StatsKey = "types" | "typeAttributes" | "typeEffects";

export const scrapeEsiTypes = client.createFunction(
  {
    id: "scrape-esi-types",
    name: "Scrape Types",
    concurrency: {
      limit: 1,
    },
    retries: 5,
  },
  { event: "scrape/esi/types" },
  async ({ step, event, logger }) => {
    const batchSize = event.data.batchSize ?? 500;

    // Get all Type IDs in ESI
    const batches = await step.run("Fetch Type IDs", async () => {
      const firstPage = await getUniverseTypes();
      const numPages = Number(firstPage.headers?.["x-pages"]);
      let typeIds = firstPage.data;
      for (let page = 2; page <= numPages; page++) {
        typeIds.push(
          ...(await getUniverseTypes({ page }).then((res) => res.data)),
        );
      }
      typeIds.sort((a, b) => a - b);

      const numBatches = Math.ceil(typeIds.length / batchSize);
      const batchTypeIds = (batchIndex: number) =>
        typeIds.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);
      return [...Array(numBatches).keys()].map((batchId) =>
        batchTypeIds(batchId),
      );
    });

    let results: BatchStepResult<StatsKey>[] = [];
    const limit = pLimit(20);

    // update types in batches
    for (let i = 0; i < batches.length; i++) {
      const result = await step.run(
        `Batch ${i + 1}/${batches.length}`,
        async (): Promise<BatchStepResult<StatsKey>> => {
          const stepStartTime = performance.now();
          const thisBatchTypeIds = batches[i]!;

          const iconIds = await prisma.icon
            .findMany({
              select: {
                iconId: true,
              },
            })
            .then((entries) => entries.map((entry) => entry.iconId));
          let numEntriesMissingIcon = 0;

          const typeChanges = await updateTable({
            fetchLocalEntries: async () =>
              prisma.type
                .findMany({
                  where: {
                    typeId: {
                      in: thisBatchTypeIds,
                    },
                  },
                })
                .then((entries) =>
                  entries.map((entry) =>
                    excludeObjectKeys(entry, ["updatedAt"]),
                  ),
                ),
            fetchRemoteEntries: async () =>
              Promise.all(
                thisBatchTypeIds.map((typeId) =>
                  limit(async () =>
                    getUniverseTypesTypeId(typeId)
                      .then((res) => res.data)
                      .then((type) => ({
                        typeId: type.type_id,
                        iconId: (() => {
                          if (type.icon_id && !iconIds.includes(type.icon_id)) {
                            numEntriesMissingIcon++;
                            console.warn("Type is missing icon entry", type);
                          }
                          return type.icon_id && iconIds.includes(type.icon_id)
                            ? type.icon_id
                            : null;
                        })(),
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
                      })),
                  ),
                ),
              ),
            batchCreate: (entries) =>
              limit(() =>
                prisma.type.createMany({
                  data: entries,
                }),
              ),
            batchDelete: (entries) =>
              prisma.type.updateMany({
                data: {
                  isDeleted: true,
                },
                where: {
                  typeId: {
                    in: entries.map((type) => type.typeId),
                  },
                },
              }),
            batchUpdate: (entries) =>
              Promise.all(
                entries.map((entry) =>
                  limit(async () =>
                    prisma.type.update({
                      data: entry,
                      where: { typeId: entry.typeId },
                    }),
                  ),
                ),
              ),
            idAccessor: (e) => e.typeId,
          });

          /**
           * Deal with DogmaAttributes attached to the Type
           */
          const typeAttributesChanges = await updateTable({
            fetchLocalEntries: async () =>
              prisma.typeAttribute
                .findMany({
                  where: {
                    typeId: {
                      in: thisBatchTypeIds,
                    },
                  },
                })
                .then((entries) =>
                  entries.map((record) =>
                    excludeObjectKeys(record, ["updatedAt", "isDeleted"]),
                  ),
                ),
            fetchRemoteEntries: async () =>
              Promise.all(
                thisBatchTypeIds.flatMap((typeId) =>
                  limit(async () =>
                    getUniverseTypesTypeId(typeId).then((res) =>
                      (res.data.dogma_attributes ?? []).map(
                        (typeAttribute) => ({
                          typeId,
                          attributeId: typeAttribute.attribute_id,
                          value: typeAttribute.value,
                        }),
                      ),
                    ),
                  ),
                ),
              ).then((types) => types.flat()),
            batchCreate: (entries) =>
              limit(() =>
                prisma.typeAttribute.createMany({
                  data: entries,
                }),
              ),
            batchDelete: async (entries) =>
              Promise.all(
                entries.map((typeAttribute) =>
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
              ),
            batchUpdate: (entries) =>
              Promise.all(
                entries.map((typeAttribute) =>
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
              ),
            idAccessor: (e) => `${e.typeId}:${e.attributeId}`,
          });

          /**
           * Deal with DogmaEffects attached to the Type
           */
          const typeEffectsChanges = await updateTable({
            fetchLocalEntries: async () =>
              prisma.typeEffect
                .findMany({
                  where: {
                    typeId: {
                      in: thisBatchTypeIds,
                    },
                  },
                })
                .then((entries) =>
                  entries.map((record) =>
                    excludeObjectKeys(record, ["updatedAt", "isDeleted"]),
                  ),
                ),
            fetchRemoteEntries: async () =>
              Promise.all(
                thisBatchTypeIds.flatMap((typeId) =>
                  limit(async () =>
                    getUniverseTypesTypeId(typeId).then((res) =>
                      (res.data.dogma_effects ?? []).map((typeEffect) => ({
                        typeId,
                        effectId: typeEffect.effect_id,
                        isDefault: typeEffect.is_default,
                      })),
                    ),
                  ),
                ),
              ).then((types) => types.flat()),
            batchCreate: (entries) =>
              limit(() =>
                prisma.typeEffect.createMany({
                  data: entries,
                }),
              ),
            batchDelete: async (entries) =>
              Promise.all(
                entries.map((typeEffect) =>
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
              ),
            batchUpdate: (entries) =>
              Promise.all(
                entries.map((typeEffect) =>
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
              ),
            idAccessor: (e) => `${e.typeId}:${e.effectId}`,
          });

          return {
            stats: {
              types: {
                created: typeChanges.created,
                deleted: typeChanges.deleted,
                modified: typeChanges.modified,
                equal: typeChanges.equal,
              },
              typeAttributes: {
                created: typeAttributesChanges.created,
                deleted: typeAttributesChanges.deleted,
                modified: typeAttributesChanges.modified,
                equal: typeAttributesChanges.equal,
              },
              typeEffects: {
                created: typeEffectsChanges.created,
                deleted: typeEffectsChanges.deleted,
                modified: typeEffectsChanges.modified,
                equal: typeEffectsChanges.equal,
              },
            },
            elapsed: performance.now() - stepStartTime,
          };
        },
      );
      results.push(result);
    }

    return await step.run("Compute Aggregates", async () => {
      const totals: BatchStepResult<StatsKey> = {
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
  },
);
