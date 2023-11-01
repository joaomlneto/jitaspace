import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";

import { client } from "../../../client";
import { excludeObjectKeys, updateTable } from "../../../utils";


export type ScrapeDogmaEffectCategoriesEventPayload = {
  data: {};
};

export const scrapeHoboleaksDogmaEffectCategories = client.createFunction(
  {
    id: "scrape-hoboleaks-dogma-effect-categories",
    name: "Scrape Dogma Effect Categories",
    concurrency: {
      limit: 1,
    },
  },
  { event: "scrape/hoboleaks/dogma-effect-categories" },
  async ({ step }) => {
    const stepStartTime = performance.now();

    // Get all Dogma Effect Categories in Hoboleaks
    const dogmaEffectCategories: Record<number, string> = await fetch(
      "https://sde.hoboleaks.space/tq/dogmaeffectcategories.json",
    ).then((res) => res.json());

    const dogmaEffectCategoryIds = Object.keys(dogmaEffectCategories).map((k) =>
      Number(k),
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

    await step.sendEvent("Function Finished", {
      name: "scrape/hoboleaks/dogma-effect-categories.finished",
      data: {},
    });

    return {
      stats: {
        dogmaEffectCategoryChanges,
      },
      elapsed: performance.now() - stepStartTime,
    };
  },
);
