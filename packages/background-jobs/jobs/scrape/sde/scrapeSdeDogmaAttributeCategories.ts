import pLimit from "p-limit";

import {
  getAllDogmaAttributeCategoryIds,
  getDogmaAttributeCategoryById,
} from "@jitaspace/sde-client";

import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { excludeObjectKeys, updateTable } from "../../../utils";

export interface ScrapeDogmaAttributeCategoriesEventPayload {
  data: {
    batchSize?: number;
  };
}

type LimitFunction = ReturnType<typeof pLimit>;

const fetchDogmaAttributeCategory = (
  attributeCategoryId: number,
  limit: LimitFunction,
) =>
  limit(async () => {
    const dogmaAttributeCategory = await getDogmaAttributeCategoryById(
      attributeCategoryId,
    ).then((res) => res.data);
    return {
      attributeCategoryId: attributeCategoryId,
      name: dogmaAttributeCategory.name,
      description: dogmaAttributeCategory.description ?? null,
      isDeleted: false,
    };
  });

export const scrapeSdeDogmaAttributeCategories = defineJob<
  ScrapeDogmaAttributeCategoriesEventPayload["data"]
>({
  id: "scrape-sde-dogma-attribute-categories",
  name: "Scrape Dogma Attribute Categories",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  handler: async () => {
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
            entries.map((entry) =>
              excludeObjectKeys(entry, ["updatedAt", "createdAt"]),
            ),
          ),
      fetchRemoteEntries: async () =>
        Promise.all(
          dogmaAttributeCategoryIds.map((attributeCategoryId) =>
            fetchDogmaAttributeCategory(attributeCategoryId, limit),
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
});
