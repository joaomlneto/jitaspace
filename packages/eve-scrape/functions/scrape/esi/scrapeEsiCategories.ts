import axios from "axios";
import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import {
  getUniverseCategories,
  getUniverseCategoriesCategoryId,
} from "@jitaspace/esi-client-kubb";

import { client } from "../../../client";
import { excludeObjectKeys, updateTable } from "../../../utils";


export type ScrapeCategoriesEventPayload = {
  data: {};
};

export const scrapeEsiCategories = client.createFunction(
  {
    id: "scrape-esi-categories",
    name: "Scrape Categories",
    concurrency: {
      limit: 1,
    },
  },
  { event: "scrape/esi/categories" },
  async ({}) => {
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
            entries.map((entry) => excludeObjectKeys(entry, ["updatedAt"])),
          ),
      fetchRemoteEntries: async () =>
        Promise.all(
          categoryIds.map((categoryId) =>
            limit(async () =>
              getUniverseCategoriesCategoryId(categoryId)
                .then((res) => res.data)
                .then((category) => ({
                  categoryId: category.category_id,
                  name: category.name,
                  published: category.published,
                  isDeleted: false,
                })),
            ),
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
);
