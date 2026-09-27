import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  ingestSdeCompositeTable,
  loadSdeFile,
  requiredNumber,
  subRecord,
} from "../../../helpers";

export interface IngestSdeSkinrSlotsToMaterialsEventPayload {
  data: Record<string, never>;
}

/**
 * skinrSlotsToMaterials.yaml — the default SKINR material for each slot, per
 * faction. Keyed by FACTION id (not by slot or configuration), and each record
 * is a bare array of `{ slotID, materialID }`, so the file is registered as
 * `noTransform`: injecting an id would set a property on that array.
 *
 * This is the join the other nine SKINR files were missing.
 */
export const ingestSdeSkinrSlotsToMaterials = defineJob<
  IngestSdeSkinrSlotsToMaterialsEventPayload["data"]
>({
  id: "ingest-sde-skinr-slots-to-materials",
  name: "Ingest SDE SKINR Slots To Materials",
  description:
    "Download the SDE and ingest skinrSlotsToMaterials.yaml into the SkinrFactionSlotMaterial table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const data = await loadSdeFile("skinrSlotsToMaterials.yaml");

    const rows: Prisma.SkinrFactionSlotMaterialCreateManyInput[] = [];
    for (const [key, value] of Object.entries(data)) {
      const factionId = Number(key);
      for (const entry of Array.isArray(value) ? value : []) {
        const slot = subRecord(entry);
        rows.push({
          factionId,
          skinrSlotId: requiredNumber(slot.slotID),
          skinMaterialId: requiredNumber(slot.materialID),
          isDeleted: false,
        });
      }
    }

    const skinrFactionSlotMaterials = await ingestSdeCompositeTable({
      delegate: prisma.skinrFactionSlotMaterial,
      rows,
      keyFields: ["factionId", "skinrSlotId"],
      scopeField: "factionId",
      scopeIds: Object.keys(data).map(Number),
    });

    return {
      stats: { skinrFactionSlotMaterials },
      elapsed: performance.now() - start,
    };
  },
});
