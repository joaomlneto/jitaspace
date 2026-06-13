import pLimit from "p-limit";

import {
  getDogmaAttributes,
  getDogmaAttributesAttributeId,
} from "@jitaspace/esi-client";

import type { BatchStepResult, CrudStatistics } from "../../../types";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { excludeObjectKeys, updateTable } from "../../../utils";

export interface ScrapeDogmaAttributesEventPayload {
  data: {
    batchSize?: number;
  };
}

type StatsKey = "dogmaAttributes";

const fetchRemoteDogmaAttribute = (attributeId: number, iconIds: number[]) =>
  getDogmaAttributesAttributeId(attributeId)
    .then((res) => res.data)
    .then((dogmaAttribute) => {
      const missingIcon = Boolean(
        dogmaAttribute.icon_id && !iconIds.includes(dogmaAttribute.icon_id),
      );
      if (missingIcon) {
        console.warn("Dogma Attribute is missing icon entry", dogmaAttribute);
      }
      return {
        missingIcon,
        entry: {
          attributeId: dogmaAttribute.attribute_id,
          name: dogmaAttribute.name ?? null,
          published: dogmaAttribute.published ?? null,
          description: dogmaAttribute.description ?? null,
          defaultValue: dogmaAttribute.default_value ?? null,
          displayName: dogmaAttribute.display_name ?? null,
          highIsGood: dogmaAttribute.high_is_good ?? null,
          iconId:
            dogmaAttribute.icon_id && iconIds.includes(dogmaAttribute.icon_id)
              ? dogmaAttribute.icon_id
              : null,
          stackable: dogmaAttribute.stackable ?? null,
          unitId: dogmaAttribute.unit_id ?? null,
          isDeleted: false,
        },
      };
    });

type DogmaAttributeEntry = Awaited<
  ReturnType<typeof fetchRemoteDogmaAttribute>
>["entry"];

const excludeDogmaTimestamps = <
  T extends { updatedAt: unknown; createdAt: unknown },
>(
  entries: T[],
) =>
  entries.map((entry) => excludeObjectKeys(entry, ["updatedAt", "createdAt"]));

const updateDogmaAttribute = (entry: DogmaAttributeEntry) =>
  prisma.dogmaAttribute.update({
    data: entry,
    where: { attributeId: entry.attributeId },
  });

export const scrapeEsiDogmaAttributes = defineJob<
  ScrapeDogmaAttributesEventPayload["data"]
>({
  id: "scrape-esi-dogma-attributes",
  name: "Scrape Dogma Attributes",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  handler: async (ctx) => {
    const batchSize = ctx.payload.batchSize ?? 500;

    // Get all Dogma Attribute IDs in ESI
    const batches = await ctx.run("Fetch Dogma Attribute IDs", async () => {
      const attributeIds = await getDogmaAttributes().then((res) => res.data);
      attributeIds.sort((a, b) => a - b);

      const numBatches = Math.ceil(attributeIds.length / batchSize);
      const batchTypeIds = (batchIndex: number) =>
        attributeIds.slice(
          batchIndex * batchSize,
          (batchIndex + 1) * batchSize,
        );
      return [...new Array(numBatches).keys()].map((batchId) =>
        batchTypeIds(batchId),
      );
    });

    const results: (BatchStepResult<StatsKey> & {
      numEntriesMissingIcon: number;
    })[] = [];
    const totalEntriesMissingIcon = 0;
    const limit = pLimit(20);

    const runBatchUpdate = (entries: DogmaAttributeEntry[]) =>
      Promise.all(
        entries.map((entry) => limit(() => updateDogmaAttribute(entry))),
      );

    // update in batches
    for (let i = 0; i < batches.length; i++) {
      const result = await ctx.run(
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

          const remoteResults = await Promise.all(
            thisBatchIds.map((attributeId) =>
              limit(() => fetchRemoteDogmaAttribute(attributeId, iconIds)),
            ),
          );
          const remoteEntries = remoteResults.map((result) => result.entry);
          const numEntriesMissingIcon = remoteResults.filter(
            (result) => result.missingIcon,
          ).length;

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
                .then(excludeDogmaTimestamps),
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
            batchUpdate: runBatchUpdate,
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
});
