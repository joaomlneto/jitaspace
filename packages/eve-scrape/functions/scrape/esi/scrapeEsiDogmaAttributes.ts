import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import {
  getDogmaAttributes,
  getDogmaAttributesAttributeId,
} from "@jitaspace/esi-client";

import { client } from "../../../client";
import { BatchStepResult, CrudStatistics } from "../../../types";
import { excludeObjectKeys, updateTable } from "../../../utils";

export type ScrapeDogmaAttributesEventPayload = {
  data: {
    batchSize?: number;
  };
};

type StatsKey = "dogmaAttributes";

export const scrapeEsiDogmaAttributes = client.createFunction(
  {
    id: "scrape-esi-dogma-attributes",
    name: "Scrape Dogma Attributes",
    concurrency: {
      limit: 1,
    },
  },
  { event: "scrape/esi/dogma-attributes" },
  async ({ step, event, logger }) => {
    const batchSize = event.data.batchSize ?? 500;

    // Get all Dogma Attribute IDs in ESI
    const batches = await step.run("Fetch Dogma Attribute IDs", async () => {
      const attributeIds = await getDogmaAttributes().then((res) => res.data);
      attributeIds.sort((a, b) => a - b);

      const numBatches = Math.ceil(attributeIds.length / batchSize);
      const batchTypeIds = (batchIndex: number) =>
        attributeIds.slice(
          batchIndex * batchSize,
          (batchIndex + 1) * batchSize,
        );
      return [...Array(numBatches).keys()].map((batchId) =>
        batchTypeIds(batchId),
      );
    });

    let results: (BatchStepResult<StatsKey> & {
      numEntriesMissingIcon: number;
    })[] = [];
    let totalEntriesMissingIcon = 0;
    const limit = pLimit(20);

    // update in batches
    for (let i = 0; i < batches.length; i++) {
      const result = await step.run(
        `Batch ${i + 1}/${batches.length}`,
        async (): Promise<
          BatchStepResult<StatsKey> & {
            numEntriesMissingIcon: number;
          }
        > => {
          const stepStartTime = performance.now();
          const thisBatchIds = batches[i]!;

          const iconIds = await prisma.icon
            .findMany({
              select: {
                iconId: true,
              },
            })
            .then((entries) => entries.map((entry) => entry.iconId));

          let numEntriesMissingIcon: number = 0;

          const remoteEntries = await Promise.all(
            thisBatchIds.map((attributeId) =>
              limit(async () =>
                getDogmaAttributesAttributeId(attributeId)
                  .then((res) => res.data)
                  .then((dogmaAttribute) => ({
                    attributeId: dogmaAttribute.attribute_id,
                    name: dogmaAttribute.name ?? null,
                    published: dogmaAttribute.published ?? null,
                    description: dogmaAttribute.description ?? null,
                    defaultValue: dogmaAttribute.default_value ?? null,
                    displayName: dogmaAttribute.display_name ?? null,
                    highIsGood: dogmaAttribute.high_is_good ?? null,
                    iconId: (() => {
                      if (
                        dogmaAttribute.icon_id &&
                        !iconIds.includes(dogmaAttribute.icon_id)
                      ) {
                        numEntriesMissingIcon++;
                        console.warn(
                          "Dogma Attribute is missing icon entry",
                          dogmaAttribute,
                        );
                      }
                      return dogmaAttribute.icon_id &&
                        iconIds.includes(dogmaAttribute.icon_id)
                        ? dogmaAttribute.icon_id
                        : null;
                    })(),
                    stackable: dogmaAttribute.stackable ?? null,
                    unitId: dogmaAttribute.unit_id ?? null,
                    isDeleted: false,
                  })),
              ),
            ),
          );

          const dogmaAttributesChanges = await updateTable({
            fetchLocalEntries: async () =>
              prisma.dogmaAttribute
                .findMany({
                  where: {
                    attributeId: {
                      in: thisBatchIds,
                    },
                  },
                })
                .then((entries) =>
                  entries.map((entry) =>
                    excludeObjectKeys(entry, ["updatedAt"]),
                  ),
                ),
            fetchRemoteEntries: async () => remoteEntries,
            batchCreate: (entries) =>
              limit(() =>
                prisma.dogmaAttribute.createMany({
                  data: entries,
                }),
              ),
            batchDelete: (entries) =>
              prisma.dogmaAttribute.updateMany({
                data: {
                  isDeleted: true,
                },
                where: {
                  attributeId: {
                    in: entries.map((entry) => entry.attributeId),
                  },
                },
              }),
            batchUpdate: (entries) =>
              Promise.all(
                entries.map((entry) =>
                  limit(async () =>
                    prisma.dogmaAttribute.update({
                      data: entry,
                      where: { attributeId: entry.attributeId },
                    }),
                  ),
                ),
              ),
            idAccessor: (e) => e.attributeId,
          });

          return {
            stats: {
              dogmaAttributes: {
                created: dogmaAttributesChanges.created,
                deleted: dogmaAttributesChanges.deleted,
                modified: dogmaAttributesChanges.modified,
                equal: dogmaAttributesChanges.equal,
              },
            },
            numEntriesMissingIcon,
            elapsed: performance.now() - stepStartTime,
          };
        },
      );
      results.push(result);
    }

    const totals = {
      stats: {
        dogmaAttributes: {
          created: 0,
          deleted: 0,
          modified: 0,
          equal: 0,
        },
      },
      numEntriesMissingIcon: 0,
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
      totals.numEntriesMissingIcon += stepResult.numEntriesMissingIcon;
      totals.elapsed += stepResult.elapsed;
    });
    return totals;
  },
);
