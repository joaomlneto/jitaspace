import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { enString, ingestSdeTable } from "../../../helpers";

export interface IngestSdeCorporationActivitiesEventPayload {
  data: Record<string, never>;
}

export const ingestSdeCorporationActivities = defineJob<
  IngestSdeCorporationActivitiesEventPayload["data"]
>({
  id: "ingest-sde-corporation-activities",
  name: "Ingest SDE Corporation Activities",
  description:
    "Download the SDE and ingest corporationActivities.yaml into the CorporationActivity table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const corporationActivities = await ingestSdeTable({
      filename: "corporationActivities.yaml",
      idField: "corporationActivityId",
      delegate: prisma.corporationActivity,
      toRow: (record, id): Prisma.CorporationActivityCreateManyInput => ({
        corporationActivityId: id,
        name: enString(record.name) ?? "",
        isDeleted: false,
      }),
    });
    return {
      stats: { corporationActivities },
      elapsed: performance.now() - start,
    };
  },
});
