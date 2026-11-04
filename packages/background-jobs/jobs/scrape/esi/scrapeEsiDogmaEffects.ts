import pLimit from "p-limit";

import {
  getDogmaEffects,
  getDogmaEffectsEffectId,
} from "@jitaspace/esi-client";

import type { BatchStepResult, CrudStatistics } from "../../../types";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { excludeObjectKeys, updateTable } from "../../../utils";

export interface ScrapeDogmaEffectsEventPayload {
  data: {
    batchSize?: number;
  };
}

type StatsKey = "dogmaEffects";

type LimitFunction = ReturnType<typeof pLimit>;

const fetchDogmaEffectForBatch = (
  effectId: number,
  limit: LimitFunction,
  iconIds: ReadonlySet<number>,
) =>
  limit(async () => {
    const dogmaEffect = await getDogmaEffectsEffectId(effectId).then(
      (res) => res.data,
    );
    return {
      effectId: dogmaEffect.effect_id,
      name: dogmaEffect.name ?? null,
      description: dogmaEffect.description ?? null,
      published: dogmaEffect.published ?? null,
      // `Icon` is filled by the SDE ingest, which runs after this scrape on a
      // fresh database: keep an unknown icon null rather than break the FK.
      // ingest-sde-dogma-effects sets it once the icon exists.
      iconId:
        dogmaEffect.icon_id && iconIds.has(dogmaEffect.icon_id)
          ? dogmaEffect.icon_id
          : null,
      displayName: dogmaEffect.display_name ?? null,
      disallowAutoRepeat: dogmaEffect.disallow_auto_repeat ?? null,
      effectCategoryId: dogmaEffect.effect_category ?? null,
      dischargeAttributeId: dogmaEffect.discharge_attribute_id ?? null,
      durationAttributeId: dogmaEffect.duration_attribute_id ?? null,
      electronicChance: dogmaEffect.electronic_chance ?? null,
      falloffAttributeId: dogmaEffect.falloff_attribute_id ?? null,
      isAssistance: dogmaEffect.is_assistance ?? null,
      isOffensive: dogmaEffect.is_offensive ?? null,
      isWarpSafe: dogmaEffect.is_warp_safe ?? null,
      postExpression: dogmaEffect.post_expression ?? null,
      preExpression: dogmaEffect.pre_expression ?? null,
      rangeAttributeId: dogmaEffect.range_attribute_id ?? null,
      rangeChance: dogmaEffect.range_chance ?? null,
      trackingSpeedAttributeId: dogmaEffect.tracking_speed_attribute_id ?? null,
      isDeleted: false,
    };
  });

const updateDogmaEffectsBatch = (
  thisBatchIds: number[],
  limit: LimitFunction,
  iconIds: ReadonlySet<number>,
) =>
  updateTable({
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
            // Owned by ingestSdeDogmaEffects — ESI's dogma effect endpoint
            // exposes none of these, so they stay out of this diff.
            excludeObjectKeys(entry, [
              "updatedAt",
              "createdAt",
              "propulsionChance",
              "guid",
              "distribution",
              "resistanceAttributeId",
              "npcActivationChanceAttributeId",
              "fittingUsageChanceAttributeId",
              "npcUsageChanceAttributeId",
              // Ours, written by scripts/describe-dogma-effects.ts: ESI has
              // no such field, so diffing it would mark every described
              // effect as modified on every run.
              "customDescription",
            ]),
          ),
        ),
    fetchRemoteEntries: async () =>
      Promise.all(
        thisBatchIds.map((effectId) =>
          fetchDogmaEffectForBatch(effectId, limit, iconIds),
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

export const scrapeEsiDogmaEffects = defineJob<
  ScrapeDogmaEffectsEventPayload["data"]
>({
  id: "scrape-esi-dogma-effects",
  name: "Scrape Dogma Effects",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  handler: async (ctx) => {
    const batchSize = ctx.payload.batchSize ?? 500;

    // Get all Dogma Effect IDs in ESI
    const batches = await ctx.run("Fetch Dogma Effect IDs", async () => {
      const effectIds = await getDogmaEffects().then((res) => res.data);
      effectIds.sort((a, b) => a - b);

      const numBatches = Math.ceil(effectIds.length / batchSize);
      const batchTypeIds = (batchIndex: number) =>
        effectIds.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);
      return [...new Array(numBatches).keys()].map((batchId) =>
        batchTypeIds(batchId),
      );
    });

    const results: BatchStepResult<StatsKey>[] = [];
    const limit = pLimit(20);
    const iconIds = await ctx.run(
      "Fetch known icon IDs",
      async () =>
        new Set(
          await prisma.icon
            .findMany({ select: { iconId: true } })
            .then((entries) => entries.map((entry) => entry.iconId)),
        ),
    );

    // update in batches
    for (const [i, thisBatchIds] of batches.entries()) {
      const result = await ctx.run(
        `Batch ${i + 1}/${batches.length}`,
        async (): Promise<BatchStepResult<StatsKey>> => {
          const stepStartTime = performance.now();

          const dogmaEffectsChanges = await updateDogmaEffectsBatch(
            thisBatchIds,
            limit,
            iconIds,
          );

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
  },
});
