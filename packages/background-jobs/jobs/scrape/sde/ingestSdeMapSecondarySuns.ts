import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { ingestSdeTable, requiredNumber } from "../../../helpers";

export interface IngestSdeMapSecondarySunsEventPayload {
  data: Record<string, never>;
}

export const ingestSdeMapSecondarySuns = defineJob<
  IngestSdeMapSecondarySunsEventPayload["data"]
>({
  id: "ingest-sde-map-secondary-suns",
  name: "Ingest SDE Map Secondary Suns",
  description:
    "Download the SDE and ingest mapSecondarySuns.yaml into the MapSecondarySun table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const mapSecondarySuns = await ingestSdeTable({
      filename: "mapSecondarySuns.yaml",
      idField: "secondarySunId",
      delegate: prisma.mapSecondarySun,
      toRow: (record, id): Prisma.MapSecondarySunCreateManyInput => {
        const position = (record.position ?? {}) as Record<string, unknown>;
        return {
          secondarySunId: id,
          solarSystemId: requiredNumber(record.solarSystemID),
          typeId: requiredNumber(record.typeID),
          effectBeaconTypeId: requiredNumber(record.effectBeaconTypeID),
          positionX: requiredNumber(position.x),
          positionY: requiredNumber(position.y),
          positionZ: requiredNumber(position.z),
          isDeleted: false,
        };
      },
    });
    return { stats: { mapSecondarySuns }, elapsed: performance.now() - start };
  },
});
