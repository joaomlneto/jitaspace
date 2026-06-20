import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { enString, ingestSdeTable } from "../../../helpers";

export interface IngestSdeRegionsEventPayload {
  data: Record<string, never>;
}

export const ingestSdeRegions = defineJob<IngestSdeRegionsEventPayload["data"]>(
  {
    id: "ingest-sde-regions",
    name: "Ingest SDE Regions",
    description:
      "Download the SDE and ingest mapRegions.yaml into the Region table.",
    trigger: { type: "event" },
    singleton: true,
    maxDurationSeconds: 1800,
    handler: async () => {
      const start = performance.now();
      const regions = await ingestSdeTable({
        filename: "mapRegions.yaml",
        idField: "regionId",
        delegate: prisma.region,
        toRow: (record, id): Prisma.RegionCreateManyInput => ({
          regionId: id,
          name: enString(record.name) ?? "",
          description: enString(record.description),
          isDeleted: false,
        }),
      });
      return { stats: { regions }, elapsed: performance.now() - start };
    },
  },
);
