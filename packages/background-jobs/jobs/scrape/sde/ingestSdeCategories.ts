import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { enString, ingestSdeTable, requiredBoolean } from "../../../helpers";

export interface IngestSdeCategoriesEventPayload {
  data: Record<string, never>;
}

export const ingestSdeCategories = defineJob<
  IngestSdeCategoriesEventPayload["data"]
>({
  id: "ingest-sde-categories",
  name: "Ingest SDE Categories",
  description:
    "Download the SDE and ingest categories.yaml into the Category table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const categories = await ingestSdeTable({
      filename: "categories.yaml",
      idField: "categoryId",
      delegate: prisma.category,
      toRow: (record, id): Prisma.CategoryCreateManyInput => ({
        categoryId: id,
        name: enString(record.name) ?? "",
        published: requiredBoolean(record.published),
        isDeleted: false,
      }),
    });
    return { stats: { categories }, elapsed: performance.now() - start };
  },
});
