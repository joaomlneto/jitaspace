import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { ingestSdeCompositeTable, loadSdeFiles } from "../../../helpers";

export interface IngestSdeMasteriesEventPayload {
  data: Record<string, never>;
}

const MASTERY_LEVELS = [0, 1, 2, 3, 4] as const;

/**
 * masteries.yaml maps a type to the certificates earned at each mastery level
 * (keys "0".."4", each an array of certificate ids). The type id is also
 * injected as a `typeID` field by the loader, so we read the level keys
 * explicitly rather than iterating every key.
 */
export const ingestSdeMasteries = defineJob<
  IngestSdeMasteriesEventPayload["data"]
>({
  id: "ingest-sde-masteries",
  name: "Ingest SDE Masteries",
  description:
    "Download the SDE and ingest masteries.yaml into the Mastery table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles([
      "masteries.yaml",
      "types.yaml",
      "certificates.yaml",
    ]);
    const typeIds = new Set(Object.keys(files["types.yaml"]).map(Number));
    const certificateIds = new Set(
      Object.keys(files["certificates.yaml"]).map(Number),
    );

    const rows: Prisma.MasteryCreateManyInput[] = [];
    for (const [key, value] of Object.entries(files["masteries.yaml"])) {
      const typeId = Number(key);
      if (!typeIds.has(typeId)) continue;
      const record = value as Record<string, unknown>;
      for (const masteryLevel of MASTERY_LEVELS) {
        const certs = record[String(masteryLevel)];
        if (!Array.isArray(certs)) continue;
        for (const certificateId of certs as number[]) {
          if (!certificateIds.has(certificateId)) continue;
          rows.push({ typeId, masteryLevel, certificateId, isDeleted: false });
        }
      }
    }

    const scopeIds = Object.keys(files["masteries.yaml"])
      .map(Number)
      .filter((id) => typeIds.has(id));

    const masteries = await ingestSdeCompositeTable({
      delegate: prisma.mastery,
      rows,
      keyFields: ["typeId", "masteryLevel", "certificateId"],
      scopeField: "typeId",
      scopeIds,
    });

    return { stats: { masteries }, elapsed: performance.now() - start };
  },
});
