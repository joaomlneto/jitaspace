import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { enString, ingestSdeTable, plainString } from "../../../helpers";

export interface IngestSdeDogmaUnitsEventPayload {
  data: Record<string, never>;
}

export const ingestSdeDogmaUnits = defineJob<
  IngestSdeDogmaUnitsEventPayload["data"]
>({
  id: "ingest-sde-dogma-units",
  name: "Ingest SDE Dogma Units",
  description:
    "Download the SDE and ingest dogmaUnits.yaml into the DogmaUnit table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const dogmaUnits = await ingestSdeTable({
      filename: "dogmaUnits.yaml",
      idField: "unitId",
      delegate: prisma.dogmaUnit,
      toRow: (record, id): Prisma.DogmaUnitCreateManyInput => ({
        unitId: id,
        name: plainString(record.name) ?? "",
        displayName: enString(record.displayName),
        description: enString(record.description),
        isDeleted: false,
      }),
    });
    return { stats: { dogmaUnits }, elapsed: performance.now() - start };
  },
});
