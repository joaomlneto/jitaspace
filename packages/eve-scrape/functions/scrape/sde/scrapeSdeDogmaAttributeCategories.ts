import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import {
  getAllDogmaAttributeCategoryIds,
  getDogmaAttributeCategoryById,
} from "@jitaspace/sde-client";

import { client } from "../../../client";
import { excludeObjectKeys, updateTable } from "../../../utils";


export type ScrapeDogmaAttributeCategoriesEventPayload = {
  data: {
    batchSize?: number;
  };
};

export const scrapeSdeDogmaAttributeCategories = client.createFunction(
  {
    id: "scrape-sde-dogma-attribute-categories",
    name: "Scrape Dogma Attribute Categories",
    concurrency: {
      limit: 1,
    },
  },
  { event: "scrape/sde/dogma-attribute-categories" },
  async ({ step, event, logger }) => {
    const stepStartTime = performance.now();

    // Get all Dogma Attribute Category IDs in SDE
    const dogmaAttributeCategoryIds =
      await getAllDogmaAttributeCategoryIds().then((res) => res.data);
    dogmaAttributeCategoryIds.sort((a, b) => a - b);

    const limit = pLimit(20);

    const dogmaAttributeCategoryChanges = await updateTable({
      fetchLocalEntries: async () =>
        prisma.dogmaAttributeCategory
          .findMany({
            where: {
              attributeCategoryId: {
                in: dogmaAttributeCategoryIds,
              },
            },
          })
          .then((entries) =>
            entries.map((entry) => excludeObjectKeys(entry, ["updatedAt"])),
          ),
      fetchRemoteEntries: async () =>
        Promise.all(
          dogmaAttributeCategoryIds.map((attributeCategoryId) =>
            limit(async () =>
              getDogmaAttributeCategoryById(attributeCategoryId)
                .then((res) => res.data)
                .then((dogmaAttributeCategory) => ({
                  attributeCategoryId: attributeCategoryId,
                  name: dogmaAttributeCategory.name,
                  description: dogmaAttributeCategory.description ?? null,
                  isDeleted: false,
                })),
            ),
          ),
        ),
      batchCreate: (entries) =>
        limit(() =>
          prisma.dogmaAttributeCategory.createMany({
            data: entries,
          }),
        ),
      batchDelete: (entries) =>
        prisma.dogmaAttributeCategory.updateMany({
          data: {
            isDeleted: true,
          },
          where: {
            attributeCategoryId: {
              in: entries.map((entry) => entry.attributeCategoryId),
            },
          },
        }),
      batchUpdate: (entries) =>
        Promise.all(
          entries.map((entry) =>
            limit(async () =>
              prisma.dogmaAttributeCategory.update({
                data: entry,
                where: { attributeCategoryId: entry.attributeCategoryId },
              }),
            ),
          ),
        ),
      idAccessor: (e) => e.attributeCategoryId,
    });

    return {
      stats: {
        dogmaAttributeCategoryChanges,
      },
      elapsed: performance.now() - stepStartTime,
    };
  },
);
