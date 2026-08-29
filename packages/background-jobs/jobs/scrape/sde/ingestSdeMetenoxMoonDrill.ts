import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { ingestSdeTable, requiredNumber } from "../../../helpers";

export interface IngestSdeMetenoxMoonDrillEventPayload {
  data: Record<string, never>;
}

/** metenoxMoonDrill.yaml — the Metenox Moon Drill's mining config (one row). */
export const ingestSdeMetenoxMoonDrill = defineJob<
  IngestSdeMetenoxMoonDrillEventPayload["data"]
>({
  id: "ingest-sde-metenox-moon-drill",
  name: "Ingest SDE Metenox Moon Drill",
  description:
    "Download the SDE and ingest metenoxMoonDrill.yaml into the MetenoxMoonDrill table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const metenoxMoonDrills = await ingestSdeTable({
      filename: "metenoxMoonDrill.yaml",
      idField: "typeId",
      delegate: prisma.metenoxMoonDrill,
      toRow: (record, id): Prisma.MetenoxMoonDrillCreateManyInput => ({
        typeId: id,
        miningCycleTime: requiredNumber(record.miningCycleTime),
        miningEfficiency: requiredNumber(record.miningEfficiency),
        reagentsConsumedPerCycle: requiredNumber(
          record.reagentsConsumedPerCycle,
        ),
        isDeleted: false,
      }),
    });
    return {
      stats: { metenoxMoonDrills },
      elapsed: performance.now() - start,
    };
  },
});
