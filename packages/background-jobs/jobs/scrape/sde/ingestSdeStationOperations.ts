import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeCompositeTable,
  ingestSdeTable,
  loadSdeFiles,
  requiredNumber,
} from "../../../helpers";

export interface IngestSdeStationOperationsEventPayload {
  data: Record<string, never>;
}

interface StationOperationRecord {
  services?: number[];
  stationTypes?: Record<string, number>;
}

/**
 * stationOperations.yaml defines NPC station operation types. The
 * `operationName` is also used by the stations ingest to build `Station.name`;
 * this job captures the full definition: StationOperation (activity, placement /
 * manufacturing / research factors, name), StationOperationService (`services`)
 * and StationOperationStationType (the per-race `stationTypes` map).
 */
export const ingestSdeStationOperations = defineJob<
  IngestSdeStationOperationsEventPayload["data"]
>({
  id: "ingest-sde-station-operations",
  name: "Ingest SDE Station Operations",
  description:
    "Download the SDE and ingest stationOperations.yaml into the StationOperation, StationOperationService and StationOperationStationType tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles(["stationOperations.yaml"]);
    const data = files["stationOperations.yaml"];

    const stationOperations = await ingestSdeTable({
      filename: "stationOperations.yaml",
      idField: "stationOperationId",
      delegate: prisma.stationOperation,
      records: data,
      toRow: (record, id): Prisma.StationOperationCreateManyInput => ({
        stationOperationId: id,
        activityId: requiredNumber(record.activityID),
        operationName: enString(record.operationName) ?? "",
        description: enString(record.description),
        border: requiredNumber(record.border),
        corridor: requiredNumber(record.corridor),
        fringe: requiredNumber(record.fringe),
        hub: requiredNumber(record.hub),
        ratio: requiredNumber(record.ratio),
        manufacturingFactor: requiredNumber(record.manufacturingFactor),
        researchFactor: requiredNumber(record.researchFactor),
        isDeleted: false,
      }),
    });

    const services: Prisma.StationOperationServiceCreateManyInput[] = [];
    const stationTypes: Prisma.StationOperationStationTypeCreateManyInput[] =
      [];
    for (const [key, value] of Object.entries(data)) {
      const stationOperationId = Number(key);
      const record = value as StationOperationRecord;
      for (const serviceId of record.services ?? []) {
        services.push({ stationOperationId, serviceId, isDeleted: false });
      }
      for (const [raceKey, stationTypeId] of Object.entries(
        record.stationTypes ?? {},
      )) {
        stationTypes.push({
          stationOperationId,
          raceId: Number(raceKey),
          stationTypeId: requiredNumber(stationTypeId),
          isDeleted: false,
        });
      }
    }

    const scopeIds = Object.keys(data).map(Number);
    const stationOperationServices = await ingestSdeCompositeTable({
      delegate: prisma.stationOperationService,
      rows: services,
      keyFields: ["stationOperationId", "serviceId"],
      scopeField: "stationOperationId",
      scopeIds,
    });
    const stationOperationStationTypes = await ingestSdeCompositeTable({
      delegate: prisma.stationOperationStationType,
      rows: stationTypes,
      keyFields: ["stationOperationId", "raceId"],
      scopeField: "stationOperationId",
      scopeIds,
    });

    return {
      stats: {
        stationOperations,
        stationOperationServices,
        stationOperationStationTypes,
      },
      elapsed: performance.now() - start,
    };
  },
});
