import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { enString, ingestSdeTable, plainString } from "../../../helpers";

export interface IngestSdeNotificationTypesEventPayload {
  data: Record<string, never>;
}

/**
 * notificationTypes.yaml — decodes the `type` string ESI returns on
 * `/characters/{id}/notifications/`. `displayName` is absent on one record, so
 * consumers must fall back to `internalName`.
 */
export const ingestSdeNotificationTypes = defineJob<
  IngestSdeNotificationTypesEventPayload["data"]
>({
  id: "ingest-sde-notification-types",
  name: "Ingest SDE Notification Types",
  description:
    "Download the SDE and ingest notificationTypes.yaml into the NotificationType table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const notificationTypes = await ingestSdeTable({
      filename: "notificationTypes.yaml",
      idField: "notificationTypeId",
      delegate: prisma.notificationType,
      toRow: (record, id): Prisma.NotificationTypeCreateManyInput => ({
        notificationTypeId: id,
        internalName: plainString(record.internalName) ?? "",
        displayName: enString(record.displayName),
        isDeleted: false,
      }),
    });
    return { stats: { notificationTypes }, elapsed: performance.now() - start };
  },
});
