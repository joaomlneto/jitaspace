import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeCompositeTable,
  loadSdeFiles,
  optionalBoolean,
  plainString,
  requiredBoolean,
} from "../../../helpers";

export interface IngestSdeSkinsEventPayload {
  data: Record<string, never>;
}

interface SkinRecord {
  skinMaterialID: number;
  internalName?: string;
  types?: number[];
  allowCCPDevs?: boolean;
  isStructureSkin?: boolean;
  skinDescription?: unknown;
  visibleSerenity?: boolean;
  visibleTranquility?: boolean;
}

/**
 * skins.yaml feeds Skin (the SKIN itself) and SkinType (the types it can be
 * applied to). A skin's `skinMaterialID` is FK-guarded against skinMaterials.yaml
 * and its `types` against types.yaml; skins with a dangling material are skipped
 * (which also drops their SkinType rows).
 */
export const ingestSdeSkins = defineJob<IngestSdeSkinsEventPayload["data"]>({
  id: "ingest-sde-skins",
  name: "Ingest SDE Skins",
  description:
    "Download the SDE and ingest skins.yaml into the Skin and SkinType tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 3600,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles([
      "skins.yaml",
      "skinMaterials.yaml",
      "types.yaml",
    ]);
    const typeIds = new Set(Object.keys(files["types.yaml"]).map(Number));
    const skinMaterialIds = new Set(
      Object.keys(files["skinMaterials.yaml"]).map(Number),
    );

    const skinRows: Prisma.SkinCreateManyInput[] = [];
    const skinTypeRows: Prisma.SkinTypeCreateManyInput[] = [];
    for (const [key, value] of Object.entries(files["skins.yaml"])) {
      const skinId = Number(key);
      const record = value as SkinRecord;
      if (!skinMaterialIds.has(record.skinMaterialID)) continue;
      skinRows.push({
        skinId,
        skinMaterialId: record.skinMaterialID,
        internalName: plainString(record.internalName) ?? "",
        allowCcpDevs: requiredBoolean(record.allowCCPDevs),
        isStructureSkin: optionalBoolean(record.isStructureSkin),
        skinDescription: enString(record.skinDescription),
        visibleSerenity: requiredBoolean(record.visibleSerenity),
        visibleTranquility: requiredBoolean(record.visibleTranquility),
        isDeleted: false,
      });
      for (const typeId of record.types ?? []) {
        if (!typeIds.has(typeId)) continue;
        skinTypeRows.push({ skinId, typeId, isDeleted: false });
      }
    }

    const scopeIds = skinRows.map((skin) => skin.skinId);

    const skins = await ingestSdeCompositeTable({
      delegate: prisma.skin,
      rows: skinRows,
      keyFields: ["skinId"],
      scopeField: "skinId",
      scopeIds,
    });
    const skinTypes = await ingestSdeCompositeTable({
      delegate: prisma.skinType,
      rows: skinTypeRows,
      keyFields: ["skinId", "typeId"],
      scopeField: "skinId",
      scopeIds,
    });

    return { stats: { skins, skinTypes }, elapsed: performance.now() - start };
  },
});
