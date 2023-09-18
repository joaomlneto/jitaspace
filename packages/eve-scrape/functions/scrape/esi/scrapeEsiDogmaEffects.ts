import pLimit from "p-limit";

import { DogmaEffect, prisma } from "@jitaspace/db";
import {
  getDogmaEffects,
  getDogmaEffectsEffectId,
  GetDogmaEffectsEffectId200,
} from "@jitaspace/esi-client";

import { inngest } from "../../../client";

export type ScrapeDogmaEffectsEventPayload = {
  data: {};
};

export const scrapeEsiDogmaEffects = inngest.createFunction(
  { name: "Scrape Dogma Effects" },
  { event: "scrape/esi/dogma-effects" },
  async ({ logger }) => {
    // Get all Dogma Effect IDs in ESI
    const { data: dogmaEffectIds } = await getDogmaEffects();
    logger.info(`going to fetch ${dogmaEffectIds.length} entries from ESI`);

    // Get all Dogma Effects' details from ESI
    const fetchESIDetailsStartTime = performance.now();
    const limit = pLimit(20);
    const dogmaEffectsDetailsPromises = dogmaEffectIds.map((dogmaEffectId) =>
      limit(async () => getDogmaEffectsEffectId(dogmaEffectId)),
    );
    const dogmaEffectsResponses = await Promise.all(
      dogmaEffectsDetailsPromises,
    );
    logger.info(
      `fetched ESI entries in ${performance.now() - fetchESIDetailsStartTime}`,
    );

    // extract bodies
    const dogmaEffects = dogmaEffectsResponses.map((res) => res.data);

    // determine which records to be created/updated/removed
    const existingIdsInDb = await prisma.dogmaEffect
      .findMany({
        select: {
          effectId: true,
        },
      })
      .then((dogmaEffects) =>
        dogmaEffects.map((dogmaEffect) => dogmaEffect.effectId),
      );

    const recordsToCreate = dogmaEffects.filter(
      (dogmaEffect) => !existingIdsInDb.includes(dogmaEffect.effect_id),
    );
    const recordsToUpdate = dogmaEffects.filter((dogmaEffect) =>
      existingIdsInDb.includes(dogmaEffect.effect_id),
    );
    const recordsToDelete = existingIdsInDb.filter(
      (dogmaEffectId) => !dogmaEffectIds.includes(dogmaEffectId),
    );

    logger.info("records to create:", recordsToCreate.length);
    logger.info("records to update:", recordsToUpdate.length);
    logger.info("records to delete:", recordsToDelete.length);

    const fromEsiToSchema = (
      dogmaEffect: GetDogmaEffectsEffectId200,
    ): Omit<DogmaEffect, "updatedAt"> => ({
      effectId: dogmaEffect.effect_id,
      name: dogmaEffect.name ?? null,
      description: dogmaEffect.description ?? null,
      published: dogmaEffect.published ?? null,
      iconId: dogmaEffect.icon_id ?? null,
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
    });

    // create missing records
    const createRecordsStartTime = performance.now();
    const createResult = await prisma.dogmaEffect.createMany({
      data: recordsToCreate.map(fromEsiToSchema),
      skipDuplicates: true,
    });
    logger.info(
      `created records in ${performance.now() - createRecordsStartTime}ms`,
    );

    // update all records with new data
    const updateRecordsStartTime = performance.now();
    const updateResult = await Promise.all(
      recordsToUpdate.map((dogmaEffect) =>
        prisma.dogmaEffect.update({
          data: fromEsiToSchema(dogmaEffect),
          where: { effectId: dogmaEffect.effect_id },
        }),
      ),
    );
    logger.info(
      `updated records in ${performance.now() - updateRecordsStartTime}ms`,
    );

    // mark records as deleted if missing from ESI
    const deleteRecordsStartTime = performance.now();
    const deleteResult = await prisma.dogmaEffect.updateMany({
      data: {
        isDeleted: true,
      },
      where: {
        effectId: {
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
