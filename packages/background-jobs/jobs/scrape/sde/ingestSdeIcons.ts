import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { ingestSdeTable, plainString } from "../../../helpers";

export interface IngestSdeIconsEventPayload {
  data: Record<string, never>;
}

export const ingestSdeIcons = defineJob<IngestSdeIconsEventPayload["data"]>({
  id: "ingest-sde-icons",
  name: "Ingest SDE Icons",
  description: "Download the SDE and ingest icons.yaml into the Icon table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const icons = await ingestSdeTable({
      filename: "icons.yaml",
      idField: "iconId",
      delegate: prisma.icon,
      toRow: (record, id): Prisma.IconCreateManyInput => ({
        iconId: id,
        iconFile: plainString(record.iconFile) ?? "",
        isDeleted: false,
      }),
    });
    return { stats: { icons }, elapsed: performance.now() - start };
  },
});
