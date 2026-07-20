import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { enString, ingestSdeTable, requiredNumber } from "../../../helpers";

export interface IngestSdeConstellationsEventPayload {
  data: Record<string, never>;
}

export const ingestSdeConstellations = defineJob<
  IngestSdeConstellationsEventPayload["data"]
>({
  id: "ingest-sde-constellations",
  name: "Ingest SDE Constellations",
  description:
    "Download the SDE and ingest mapConstellations.yaml into the Constellation table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const constellations = await ingestSdeTable({
      filename: "mapConstellations.yaml",
      idField: "constellationId",
      delegate: prisma.constellation,
      toRow: (record, id): Prisma.ConstellationCreateManyInput => ({
        constellationId: id,
        name: enString(record.name) ?? "",
        regionId: requiredNumber(record.regionID),
        isDeleted: false,
      }),
    });
    return { stats: { constellations }, elapsed: performance.now() - start };
  },
});
