import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeTable,
  optionalNumber,
  plainString,
} from "../../../helpers";

export interface IngestSdeMetaGroupsEventPayload {
  data: Record<string, never>;
}

export const ingestSdeMetaGroups = defineJob<
  IngestSdeMetaGroupsEventPayload["data"]
>({
  id: "ingest-sde-meta-groups",
  name: "Ingest SDE Meta Groups",
  description:
    "Download the SDE and ingest metaGroups.yaml into the MetaGroup table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const metaGroups = await ingestSdeTable({
      filename: "metaGroups.yaml",
      idField: "metaGroupId",
      delegate: prisma.metaGroup,
      toRow: (record, id): Prisma.MetaGroupCreateManyInput => {
        const color = (record.color ?? {}) as Record<string, unknown>;
        return {
          metaGroupId: id,
          name: enString(record.name) ?? "",
          description: enString(record.description),
          iconId: optionalNumber(record.iconID),
          iconSuffix: plainString(record.iconSuffix),
          colorR: optionalNumber(color.r),
          colorG: optionalNumber(color.g),
          colorB: optionalNumber(color.b),
          isDeleted: false,
        };
      },
    });
    return { stats: { metaGroups }, elapsed: performance.now() - start };
  },
});
