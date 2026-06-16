import pLimit from "p-limit";

import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { excludeObjectKeys, updateTable } from "../../../utils";

export interface ScrapeDogmaEffectCategoriesEventPayload {
  data: {};
}

export const scrapeHoboleaksDogmaEffectCategories = defineJob<
  ScrapeDogmaEffectCategoriesEventPayload["data"]
>({
  id: "scrape-hoboleaks-dogma-effect-categories",
  name: "Scrape Dogma Effect Categories",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  handler: async () => {
    const stepStartTime = performance.now();

    // Get all Dogma Effect Categories in Hoboleaks
    const dogmaEffectCategories: Record<number, string> = await fetch(
      "https://sde.hoboleaks.space/tq/dogmaeffectcategories.json",
    ).then((res) => res.json());

    const dogmaEffectCategoryIds = Object.keys(dogmaEffectCategories).map(
      Number,
    );

    const limit = pLimit(20);

    const dogmaEffectCategoryChanges = await updateTable({
      fetchLocalEntries: async () =>
        prisma.dogmaEffectCategory
          .findMany({
            where: {
              effectCategoryId: {
                in: dogmaEffectCategoryIds,
              },
            },
          })
          .then((entries) =>
            entries.map((entry) => excludeObjectKeys(entry, ["updatedAt"])),
          ),
      fetchRemoteEntries: async () =>
        Object.entries(dogmaEffectCategories).map(
          ([effectCategoryId, name]) => ({
            effectCategoryId: Number(effectCategoryId),
            name,
            isDeleted: false,
          }),
        ),
      batchCreate: (entries) =>
        limit(() =>
          prisma.dogmaEffectCategory.createMany({
            data: entries,
          }),
        ),
      batchDelete: (entries) =>
        prisma.dogmaEffectCategory.updateMany({
          data: {
            isDeleted: true,
          },
          where: {
            effectCategoryId: {
              in: entries.map((entry) => entry.effectCategoryId),
            },
          },
        }),
      batchUpdate: (entries) =>
        Promise.all(
          entries.map((entry) =>
            limit(async () =>
              prisma.dogmaEffectCategory.update({
                data: entry,
                where: { effectCategoryId: entry.effectCategoryId },
              }),
            ),
          ),
        ),
      idAccessor: (e) => e.effectCategoryId,
    });

    return {
      stats: {
        dogmaEffectCategoryChanges,
      },
      elapsed: performance.now() - stepStartTime,
    };
  },
});
