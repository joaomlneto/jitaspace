import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  ingestSdeCompositeTable,
  loadSdeFiles,
  requiredNumber,
} from "../../../helpers";

export interface IngestSdeTypeMaterialsEventPayload {
  data: Record<string, never>;
}

interface TypeMaterialsRecord {
  materials?: { materialTypeID: number; quantity: number }[];
}

/**
 * typeMaterials.yaml maps a type to its reprocessing/refining output. Only the
 * standard `materials` array is modelled; the rare `randomizedMaterials` (a
 * handful of ores with a min/max yield) is skipped.
 */
export const ingestSdeTypeMaterials = defineJob<
  IngestSdeTypeMaterialsEventPayload["data"]
>({
  id: "ingest-sde-type-materials",
  name: "Ingest SDE Type Materials",
  description:
    "Download the SDE and ingest typeMaterials.yaml into the TypeMaterial table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 3600,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles(["typeMaterials.yaml", "types.yaml"]);
    const typeIds = new Set(Object.keys(files["types.yaml"]).map(Number));

    const materials: Prisma.TypeMaterialCreateManyInput[] = [];
    for (const [key, value] of Object.entries(files["typeMaterials.yaml"])) {
      const typeId = Number(key);
      if (!typeIds.has(typeId)) continue;
      const record = value as TypeMaterialsRecord;
      for (const material of record.materials ?? []) {
        if (!typeIds.has(material.materialTypeID)) continue;
        materials.push({
          typeId,
          materialTypeId: material.materialTypeID,
          quantity: requiredNumber(material.quantity),
          isDeleted: false,
        });
      }
    }

    const scopeIds = Object.keys(files["typeMaterials.yaml"])
      .map(Number)
      .filter((id) => typeIds.has(id));

    const typeMaterials = await ingestSdeCompositeTable({
      delegate: prisma.typeMaterial,
      rows: materials,
      keyFields: ["typeId", "materialTypeId"],
      scopeField: "typeId",
      scopeIds,
    });

    return { stats: { typeMaterials }, elapsed: performance.now() - start };
  },
});
