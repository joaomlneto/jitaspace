import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeTable,
  requiredBoolean,
  requiredNumber,
} from "../../../helpers";

export interface IngestSdeGroupsEventPayload {
  data: Record<string, never>;
}

export const ingestSdeGroups = defineJob<IngestSdeGroupsEventPayload["data"]>({
  id: "ingest-sde-groups",
  name: "Ingest SDE Groups",
  description: "Download the SDE and ingest groups.yaml into the Group table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const groups = await ingestSdeTable({
      filename: "groups.yaml",
      idField: "groupId",
      delegate: prisma.group,
      toRow: (record, id): Prisma.GroupCreateManyInput => ({
        groupId: id,
        categoryId: requiredNumber(record.categoryID),
        name: enString(record.name) ?? "",
        published: requiredBoolean(record.published),
        isDeleted: false,
      }),
    });
    return { stats: { groups }, elapsed: performance.now() - start };
  },
});
