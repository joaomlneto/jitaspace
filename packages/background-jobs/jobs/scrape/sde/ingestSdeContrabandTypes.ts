import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  ingestSdeCompositeTable,
  loadSdeFiles,
  requiredNumber,
} from "../../../helpers";

export interface IngestSdeContrabandTypesEventPayload {
  data: Record<string, never>;
}

interface ContrabandFactionBody {
  attackMinSec: number;
  confiscateMinSec: number;
  fineByValue: number;
  standingLoss: number;
}
interface ContrabandTypesRecord {
  factions?: Record<string, ContrabandFactionBody>;
}

/**
 * contrabandTypes.yaml maps a type to the per-faction rules (fines, security
 * thresholds, standing loss) for carrying it as contraband.
 */
export const ingestSdeContrabandTypes = defineJob<
  IngestSdeContrabandTypesEventPayload["data"]
>({
  id: "ingest-sde-contraband-types",
  name: "Ingest SDE Contraband Types",
  description:
    "Download the SDE and ingest contrabandTypes.yaml into the ContrabandType table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles([
      "contrabandTypes.yaml",
      "types.yaml",
      "factions.yaml",
    ]);
    const typeIds = new Set(Object.keys(files["types.yaml"]).map(Number));
    const factionIds = new Set(Object.keys(files["factions.yaml"]).map(Number));

    const rows: Prisma.ContrabandTypeCreateManyInput[] = [];
    for (const [key, value] of Object.entries(files["contrabandTypes.yaml"])) {
      const typeId = Number(key);
      if (!typeIds.has(typeId)) continue;
      const record = value as ContrabandTypesRecord;
      for (const [factionKey, body] of Object.entries(record.factions ?? {})) {
        const factionId = Number(factionKey);
        if (!factionIds.has(factionId)) continue;
        rows.push({
          typeId,
          factionId,
          attackMinSec: requiredNumber(body.attackMinSec),
          confiscateMinSec: requiredNumber(body.confiscateMinSec),
          fineByValue: requiredNumber(body.fineByValue),
          standingLoss: requiredNumber(body.standingLoss),
          isDeleted: false,
        });
      }
    }

    const scopeIds = Object.keys(files["contrabandTypes.yaml"])
      .map(Number)
      .filter((id) => typeIds.has(id));

    const contrabandTypes = await ingestSdeCompositeTable({
      delegate: prisma.contrabandType,
      rows,
      keyFields: ["typeId", "factionId"],
      scopeField: "typeId",
      scopeIds,
    });

    return { stats: { contrabandTypes }, elapsed: performance.now() - start };
  },
});
