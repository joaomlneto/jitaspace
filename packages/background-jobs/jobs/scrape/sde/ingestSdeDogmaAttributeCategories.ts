import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { ingestSdeTable, plainString } from "../../../helpers";

export interface IngestSdeDogmaAttributeCategoriesEventPayload {
  data: Record<string, never>;
}

export const ingestSdeDogmaAttributeCategories = defineJob<
  IngestSdeDogmaAttributeCategoriesEventPayload["data"]
>({
  id: "ingest-sde-dogma-attribute-categories",
  name: "Ingest SDE Dogma Attribute Categories",
  description:
    "Download the SDE and ingest dogmaAttributeCategories.yaml into the DogmaAttributeCategory table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const dogmaAttributeCategories = await ingestSdeTable({
      filename: "dogmaAttributeCategories.yaml",
      idField: "attributeCategoryId",
      delegate: prisma.dogmaAttributeCategory,
      toRow: (record, id): Prisma.DogmaAttributeCategoryCreateManyInput => ({
        attributeCategoryId: id,
        name: plainString(record.name) ?? "",
        description: plainString(record.description),
        isDeleted: false,
      }),
    });
    return {
      stats: { dogmaAttributeCategories },
      elapsed: performance.now() - start,
    };
  },
});
