import pLimit from "p-limit";

import {
  getUniverseCategories,
  getUniverseCategoriesCategoryId,
} from "@jitaspace/esi-client";

import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { excludeObjectKeys, updateTable } from "../../../utils";

export interface ScrapeCategoriesEventPayload {
  data: Record<string, never>;
}

// Extracted to keep the per-category fetch from nesting too deeply.
const fetchRemoteCategory = (
  limit: ReturnType<typeof pLimit>,
  categoryId: number,
) =>
  limit(async () =>
    getUniverseCategoriesCategoryId(categoryId)
      .then((res) => res.data)
      .then((category) => ({
        categoryId: category.category_id,
        name: category.name,
        published: category.published,
        isDeleted: false,
      })),
  );

export const scrapeEsiCategories = defineJob<
  ScrapeCategoriesEventPayload["data"]
>({
  id: "scrape-esi-categories",
  name: "Scrape Categories",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  handler: async () => {
    const stepStartTime = performance.now();

    // Get all Category IDs in ESI
    const categoryIds = await getUniverseCategories().then((res) => res.data);
    categoryIds.sort((a, b) => a - b);

    const limit = pLimit(20);

    const categoryChanges = await updateTable({
      fetchLocalEntries: async () =>
        prisma.category
          .findMany({
            where: {
              categoryId: {
                in: categoryIds,
              },
            },
          })
          .then((entries) =>
            entries.map((entry) =>
              excludeObjectKeys(entry, ["updatedAt", "createdAt"]),
            ),
          ),
      fetchRemoteEntries: async () =>
        Promise.all(
          categoryIds.map((categoryId) =>
            fetchRemoteCategory(limit, categoryId),
          ),
        ),
      batchCreate: (entries) =>
        limit(() =>
          prisma.category.createMany({
            data: entries,
          }),
        ),
      batchDelete: (entries) =>
        prisma.category.updateMany({
          data: {
            isDeleted: true,
          },
          where: {
            categoryId: {
              in: entries.map((entry) => entry.categoryId),
            },
          },
        }),
      batchUpdate: (entries) =>
        Promise.all(
          entries.map((entry) =>
            limit(async () =>
              prisma.category.update({
                data: entry,
                where: { categoryId: entry.categoryId },
              }),
            ),
          ),
        ),
      idAccessor: (e) => e.categoryId,
    });

    return {
      stats: {
        constellations: {
          created: categoryChanges.created,
          deleted: categoryChanges.deleted,
          modified: categoryChanges.modified,
          equal: categoryChanges.equal,
        },
      },
      elapsed: performance.now() - stepStartTime,
    };
  },
});
