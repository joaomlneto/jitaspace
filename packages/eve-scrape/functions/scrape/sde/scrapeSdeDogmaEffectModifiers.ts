import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import {
  getAllDogmaEffectIds,
  getDogmaEffectById,
} from "@jitaspace/sde-client";

import { client } from "../../../client";
import { excludeObjectKeys, updateTable } from "../../../utils";


export type ScrapeDogmaEffectModifiersEventPayload = {
  data: {
    batchSize?: number;
  };
};

export const scrapeSdeDogmaEffectModifiers = client.createFunction(
  {
    id: "scrape-sde-dogma-effect-modifiers",
    name: "Scrape Dogma Effect Modifiers",
    concurrency: {
      limit: 1,
    },
  },
  { event: "scrape/sde/dogma-effect-modifiers" },
  async ({ step, event, logger }) => {
    const stepStartTime = performance.now();
    const limit = pLimit(20);

    // Get all Dogma Effect Modifier IDs in SDE
    const dogmaEffectIds = await getAllDogmaEffectIds().then((res) => res.data); //.slice(2708, 2709);
    dogmaEffectIds.sort((a, b) => a - b);

    const dogmaEffects = await Promise.all(
      dogmaEffectIds.map((effectId) =>
        limit(async () => getDogmaEffectById(effectId).then((res) => res.data)),
      ),
    );

    const dogmaEffectModifiers = dogmaEffects.flatMap((effect) =>
      (effect.modifierInfo ?? []).map((modifier, index) => ({
        effectId: effect.effectID,
        modifierIndex: index,
        domain: modifier.domain ?? null,
        targetEffectId: modifier.effectID ?? null,
        func: modifier.func,
        modifiedAttributeId: modifier.modifiedAttributeID ?? null,
        modifyingAttributeId: modifier.modifyingAttributeID ?? null,
        operator: modifier.operation ?? null,
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
            entries.map((entry) => excludeObjectKeys(entry, ["updatedAt"])),
          ),
      fetchRemoteEntries: async () => dogmaEffectModifiers,
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
);
