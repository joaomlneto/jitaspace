import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { enString, ingestSdeTable } from "../../../helpers";

export interface IngestSdeStationServicesEventPayload {
  data: Record<string, never>;
}

export const ingestSdeStationServices = defineJob<
  IngestSdeStationServicesEventPayload["data"]
>({
  id: "ingest-sde-station-services",
  name: "Ingest SDE Station Services",
  description:
    "Download the SDE and ingest stationServices.yaml into the StationService table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const stationServices = await ingestSdeTable({
      filename: "stationServices.yaml",
      idField: "stationServiceId",
      delegate: prisma.stationService,
      toRow: (record, id): Prisma.StationServiceCreateManyInput => ({
        stationServiceId: id,
        name: enString(record.serviceName),
        description: enString(record.description),
        isDeleted: false,
      }),
    });
    return { stats: { stationServices }, elapsed: performance.now() - start };
  },
});
