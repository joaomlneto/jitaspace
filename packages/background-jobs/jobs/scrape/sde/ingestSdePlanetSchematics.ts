import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeCompositeTable,
  ingestSdeTable,
  loadSdeFiles,
  requiredBoolean,
  requiredNumber,
} from "../../../helpers";

export interface IngestSdePlanetSchematicsEventPayload {
  data: Record<string, never>;
}

interface PlanetSchematicRecord {
  pins?: number[];
  types?: Record<string, { isInput: boolean; quantity: number }>;
}

/**
 * planetSchematics.yaml defines planetary-industry recipes. Feeds PlanetSchematic
 * (name + cycle time), PlanetSchematicType (input/output materials) and
 * PlanetSchematicPin (usable pin structure types).
 */
export const ingestSdePlanetSchematics = defineJob<
  IngestSdePlanetSchematicsEventPayload["data"]
>({
  id: "ingest-sde-planet-schematics",
  name: "Ingest SDE Planet Schematics",
  description:
    "Download the SDE and ingest planetSchematics.yaml into the PlanetSchematic, PlanetSchematicType and PlanetSchematicPin tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles(["planetSchematics.yaml"]);
    const data = files["planetSchematics.yaml"];

    const planetSchematics = await ingestSdeTable({
      filename: "planetSchematics.yaml",
      idField: "planetSchematicId",
      delegate: prisma.planetSchematic,
      records: data,
      toRow: (record, id): Prisma.PlanetSchematicCreateManyInput => ({
        planetSchematicId: id,
        name: enString(record.name) ?? "",
        cycleTime: requiredNumber(record.cycleTime),
        isDeleted: false,
      }),
    });

    const schematicTypes: Prisma.PlanetSchematicTypeCreateManyInput[] = [];
    const pins: Prisma.PlanetSchematicPinCreateManyInput[] = [];
    for (const [key, value] of Object.entries(data)) {
      const planetSchematicId = Number(key);
      const record = value as PlanetSchematicRecord;
      for (const [typeKey, body] of Object.entries(record.types ?? {})) {
        schematicTypes.push({
          planetSchematicId,
          typeId: Number(typeKey),
          isInput: requiredBoolean(body.isInput),
          quantity: requiredNumber(body.quantity),
          isDeleted: false,
        });
      }
      for (const pinTypeId of record.pins ?? []) {
        pins.push({ planetSchematicId, pinTypeId, isDeleted: false });
      }
    }

    const scopeIds = Object.keys(data).map(Number);
    const planetSchematicTypes = await ingestSdeCompositeTable({
      delegate: prisma.planetSchematicType,
      rows: schematicTypes,
      keyFields: ["planetSchematicId", "typeId"],
      scopeField: "planetSchematicId",
      scopeIds,
    });
    const planetSchematicPins = await ingestSdeCompositeTable({
      delegate: prisma.planetSchematicPin,
      rows: pins,
      keyFields: ["planetSchematicId", "pinTypeId"],
      scopeField: "planetSchematicId",
      scopeIds,
    });

    return {
      stats: { planetSchematics, planetSchematicTypes, planetSchematicPins },
      elapsed: performance.now() - start,
    };
  },
});
