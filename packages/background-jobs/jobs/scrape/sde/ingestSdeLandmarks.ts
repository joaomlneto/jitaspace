import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeTable,
  optionalNumber,
  requiredNumber,
} from "../../../helpers";

export interface IngestSdeLandmarksEventPayload {
  data: Record<string, never>;
}

export const ingestSdeLandmarks = defineJob<
  IngestSdeLandmarksEventPayload["data"]
>({
  id: "ingest-sde-landmarks",
  name: "Ingest SDE Landmarks",
  description:
    "Download the SDE and ingest landmarks.yaml into the Landmark table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const landmarks = await ingestSdeTable({
      filename: "landmarks.yaml",
      idField: "landmarkId",
      delegate: prisma.landmark,
      toRow: (record, id): Prisma.LandmarkCreateManyInput => {
        const position = (record.position ?? {}) as Record<string, unknown>;
        return {
          landmarkId: id,
          name: enString(record.name) ?? "",
          description: enString(record.description),
          iconId: optionalNumber(record.iconID),
          locationId: optionalNumber(record.locationID),
          positionX: requiredNumber(position.x),
          positionY: requiredNumber(position.y),
          positionZ: requiredNumber(position.z),
          isDeleted: false,
        };
      },
    });
    return { stats: { landmarks }, elapsed: performance.now() - start };
  },
});
