import pLimit from "p-limit";

import {
  getAllDogmaEffectIds,
  getDogmaEffectById,
} from "@jitaspace/sde-client";

import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { excludeObjectKeys, updateTable } from "../../../utils";

export interface ScrapeDogmaEffectModifiersEventPayload {
  data: {
    batchSize?: number;
  };
}

export const scrapeSdeDogmaEffectModifiers = defineJob<
  ScrapeDogmaEffectModifiersEventPayload["data"]
>({
  id: "scrape-sde-dogma-effect-modifiers",
  name: "Scrape Dogma Effect Modifiers",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  handler: async () => {
    const stepStartTime = performance.now();
    const limit = pLimit(20);

    // Get all Dogma Effect Modifier IDs in SDE
    const dogmaEffectIds = await getAllDogmaEffectIds().then((res) => res.data); //.slice(2708, 2709);
    dogmaEffectIds.sort((a, b) => a - b);

    const dogmaEffects = await Promise.all(
      dogmaEffectIds.map((effectId) =>
        limit(async () => ({
          effectId,
          effect: await getDogmaEffectById(effectId).then((res) => res.data),
        })),
      ),
    );

    const dogmaEffectModifiers = dogmaEffects.flatMap(({ effectId, effect }) =>
      effect.modifierInfo.map((modifier, index) => ({
        effectId,
        modifierIndex: index,
        domain: modifier.domain,
        targetEffectId: modifier.effectID,
        func: modifier.func,
        modifiedAttributeId: modifier.modifiedAttributeID,
        modifyingAttributeId: modifier.modifyingAttributeID,
        operator: modifier.operation,
        groupId: modifier.groupID,
        skillTypeId: modifier.skillTypeID,
        isDeleted: false,
      })),
    );

    const dogmaAttributeCategoryChanges = await updateTable({
      fetchLocalEntries: async () =>
        prisma.dogmaEffectModifier
          .findMany({
            where: {
              effectId: {
                in: dogmaEffectIds,
              },
            },
          })
          .then((entries) =>
            entries.map((entry) =>
              excludeObjectKeys(entry, ["updatedAt", "createdAt"]),
            ),
          ),
      fetchRemoteEntries: () => Promise.resolve(dogmaEffectModifiers),
      batchCreate: (entries) =>
        limit(() =>
          prisma.dogmaEffectModifier.createMany({
            data: entries,
          }),
        ),
      batchDelete: (entries) =>
        prisma.dogmaEffectModifier.updateMany({
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
              prisma.dogmaEffectModifier.update({
                data: entry,
                where: {
                  effectId_modifierIndex: {
                    effectId: entry.effectId,
                    modifierIndex: entry.modifierIndex,
                  },
                },
              }),
            ),
          ),
        ),
      idAccessor: (e) => `${e.effectId}:${e.modifierIndex}`,
    });

    return {
      stats: {
        dogmaAttributeCategoryChanges,
      },
      elapsed: performance.now() - stepStartTime,
    };
  },
});
