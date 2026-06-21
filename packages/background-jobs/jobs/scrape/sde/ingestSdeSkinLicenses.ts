import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  ingestSdeCompositeTable,
  loadSdeFiles,
  optionalBoolean,
  requiredNumber,
} from "../../../helpers";

export interface IngestSdeSkinLicensesEventPayload {
  data: Record<string, never>;
}

interface SkinLicenseRecord {
  skinID: number;
  duration?: number;
  isSingleUse?: boolean;
}

/**
 * skinLicenses.yaml maps a license item type to the SKIN it grants. The `skinID`
 * is FK-guarded against the SKINs that the skins job actually ingests — i.e.
 * skins whose `skinMaterialID` exists — so a license never references a dropped
 * skin.
 */
export const ingestSdeSkinLicenses = defineJob<
  IngestSdeSkinLicensesEventPayload["data"]
>({
  id: "ingest-sde-skin-licenses",
  name: "Ingest SDE Skin Licenses",
  description:
    "Download the SDE and ingest skinLicenses.yaml into the SkinLicense table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 3600,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles([
      "skinLicenses.yaml",
      "skins.yaml",
      "skinMaterials.yaml",
    ]);
    const skinMaterialIds = new Set(
      Object.keys(files["skinMaterials.yaml"]).map(Number),
    );
    // Mirror the skins job's filter: only skins with a present material survive.
    const validSkinIds = new Set(
      Object.entries(files["skins.yaml"])
        .filter(([, value]) =>
          skinMaterialIds.has(
            (value as { skinMaterialID: number }).skinMaterialID,
          ),
        )
        .map(([key]) => Number(key)),
    );

    const rows: Prisma.SkinLicenseCreateManyInput[] = [];
    for (const [key, value] of Object.entries(files["skinLicenses.yaml"])) {
      const licenseTypeId = Number(key);
      const record = value as SkinLicenseRecord;
      if (!validSkinIds.has(record.skinID)) continue;
      rows.push({
        licenseTypeId,
        skinId: record.skinID,
        duration: requiredNumber(record.duration),
        isSingleUse: optionalBoolean(record.isSingleUse),
        isDeleted: false,
      });
    }

    const scopeIds = rows.map((row) => row.licenseTypeId);

    const skinLicenses = await ingestSdeCompositeTable({
      delegate: prisma.skinLicense,
      rows,
      keyFields: ["licenseTypeId"],
      scopeField: "licenseTypeId",
      scopeIds,
    });

    return { stats: { skinLicenses }, elapsed: performance.now() - start };
  },
});
