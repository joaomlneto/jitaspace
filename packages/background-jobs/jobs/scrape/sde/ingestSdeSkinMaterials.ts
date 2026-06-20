import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { enString, ingestSdeTable, requiredNumber } from "../../../helpers";

export interface IngestSdeSkinMaterialsEventPayload {
  data: Record<string, never>;
}

export const ingestSdeSkinMaterials = defineJob<
  IngestSdeSkinMaterialsEventPayload["data"]
>({
  id: "ingest-sde-skin-materials",
  name: "Ingest SDE Skin Materials",
  description:
    "Download the SDE and ingest skinMaterials.yaml into the SkinMaterial table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const skinMaterials = await ingestSdeTable({
      filename: "skinMaterials.yaml",
      idField: "skinMaterialId",
      delegate: prisma.skinMaterial,
      toRow: (record, id): Prisma.SkinMaterialCreateManyInput => ({
        skinMaterialId: id,
        displayName: enString(record.displayName),
        materialSetId: requiredNumber(record.materialSetID),
        isDeleted: false,
      }),
    });
    return { stats: { skinMaterials }, elapsed: performance.now() - start };
  },
});
