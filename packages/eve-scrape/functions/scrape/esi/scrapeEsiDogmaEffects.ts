import axios from "axios";
import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import {
  getDogmaEffects,
  getDogmaEffectsEffectId,
} from "@jitaspace/esi-client-kubb";

import { client } from "../../../client";
import { BatchStepResult, CrudStatistics } from "../../../types";
import { excludeObjectKeys, updateTable } from "../../../utils";


export type ScrapeDogmaEffectsEventPayload = {
  data: {
    batchSize?: number;
  };
};

type StatsKey = "dogmaEffects";

export const scrapeEsiDogmaEffects = client.createFunction(
  {
    id: "scrape-esi-dogma-effects",
    name: "Scrape Dogma Effects",
    concurrency: {
      limit: 1,
    },
  },
  { event: "scrape/esi/dogma-effects" },
  async ({ step, event, logger }) => {
    const batchSize = event.data.batchSize ?? 500;

    // Get all Dogma Effect IDs in ESI
    const batches = await step.run("Fetch Dogma Effect IDs", async () => {
      const effectIds = await getDogmaEffects().then((res) => res.data);
      effectIds.sort((a, b) => a - b);

      const numBatches = Math.ceil(effectIds.length / batchSize);
      const batchTypeIds = (batchIndex: number) =>
        effectIds.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);
      return [...Array(numBatches).keys()].map((batchId) =>
        batchTypeIds(batchId),
      );
    });

    let results: BatchStepResult<StatsKey>[] = [];
    const limit = pLimit(20);

    // update in batches
    for (let i = 0; i < batches.length; i++) {
      const result = await step.run(
        `Batch ${i + 1}/${batches.length}`,
        async (): Promise<BatchStepResult<StatsKey>> => {
          const stepStartTime = performance.now();
          const thisBatchIds = batches[i]!;

          const dogmaEffectsChanges = await updateTable({
            fetchLocalEntries: async () =>
              prisma.dogmaEffect
                .findMany({
                  where: {
                    effectId: {
                      in: thisBatchIds,
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
                thisBatchIds.map((effectId) =>
                  limit(async () =>
                    getDogmaEffectsEffectId(effectId)
                      .then((res) => res.data)
                      .then((dogmaEffect) => ({
                        effectId: dogmaEffect.effect_id,
                        name: dogmaEffect.name ?? null,
                        description: dogmaEffect.description ?? null,
                        published: dogmaEffect.published ?? null,
                        iconId: dogmaEffect.icon_id ?? null,
                        displayName: dogmaEffect.display_name ?? null,
                        disallowAutoRepeat:
                          dogmaEffect.disallow_auto_repeat ?? null,
                        effectCategoryId: dogmaEffect.effect_category ?? null,
                        dischargeAttributeId:
                          dogmaEffect.discharge_attribute_id ?? null,
                        durationAttributeId:
                          dogmaEffect.duration_attribute_id ?? null,
                        electronicChance: dogmaEffect.electronic_chance ?? null,
                        falloffAttributeId:
                          dogmaEffect.falloff_attribute_id ?? null,
                        isAssistance: dogmaEffect.is_assistance ?? null,
                        isOffensive: dogmaEffect.is_offensive ?? null,
                        isWarpSafe: dogmaEffect.is_warp_safe ?? null,
                        postExpression: dogmaEffect.post_expression ?? null,
                        preExpression: dogmaEffect.pre_expression ?? null,
                        rangeAttributeId:
                          dogmaEffect.range_attribute_id ?? null,
                        rangeChance: dogmaEffect.range_chance ?? null,
                        trackingSpeedAttributeId:
                          dogmaEffect.tracking_speed_attribute_id ?? null,
                        isDeleted: false,
                      })),
                  ),
                ),
              ),
            batchCreate: (entries) =>
              limit(() =>
                prisma.dogmaEffect.createMany({
                  data: entries,
                }),
              ),
            batchDelete: (entries) =>
              prisma.dogmaEffect.updateMany({
                data: {
                  isDeleted: true,
                },
                where: {
                  effectId: {
                    in: entries.map((entry) => entry.effectId),
                  },
                },
              }),
            batchUpdate: (entries) =>
              Promise.all(
                entries.map((entry) =>
                  limit(async () =>
                    prisma.dogmaEffect.update({
                      data: entry,
                      where: { effectId: entry.effectId },
                    }),
                  ),
                ),
              ),
            idAccessor: (e) => e.effectId,
          });

          return {
            stats: {
              dogmaEffects: {
                created: dogmaEffectsChanges.created,
                deleted: dogmaEffectsChanges.deleted,
                modified: dogmaEffectsChanges.modified,
                equal: dogmaEffectsChanges.equal,
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
          dogmaEffects: {
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
