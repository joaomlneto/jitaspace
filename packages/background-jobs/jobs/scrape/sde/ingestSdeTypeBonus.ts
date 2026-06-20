import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeCompositeTable,
  ingestSdeTable,
  loadSdeFiles,
  optionalNumber,
} from "../../../helpers";

export interface IngestSdeTypeBonusEventPayload {
  data: Record<string, never>;
}

interface BonusBody {
  bonus?: number;
  bonusText?: unknown;
  importance?: number;
  unitID?: number;
}
interface TypeBonusRecord {
  iconID?: number;
  roleBonuses?: BonusBody[];
  miscBonuses?: BonusBody[];
  types?: Record<string, BonusBody[]>;
}

type Kind = Prisma.TypeBonusLineCreateManyInput["kind"];

/**
 * typeBonus.yaml holds the ship traits/bonuses of a type, split into
 * `roleBonuses`, `miscBonuses` and per-skill `types`. They feed TypeBonus (the
 * header + icon) and TypeBonusLine (one row per bonus; `skillTypeId` is 0 for
 * role/misc, `sequence` preserves order).
 */
export const ingestSdeTypeBonus = defineJob<
  IngestSdeTypeBonusEventPayload["data"]
>({
  id: "ingest-sde-type-bonus",
  name: "Ingest SDE Type Bonus",
  description:
    "Download the SDE and ingest typeBonus.yaml into the TypeBonus and TypeBonusLine tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles(["typeBonus.yaml"]);
    const data = files["typeBonus.yaml"];

    const typeBonuses = await ingestSdeTable({
      filename: "typeBonus.yaml",
      idField: "typeId",
      delegate: prisma.typeBonus,
      records: data,
      toRow: (record, id): Prisma.TypeBonusCreateManyInput => ({
        typeId: id,
        iconId: optionalNumber(record.iconID),
        isDeleted: false,
      }),
    });

    const lines: Prisma.TypeBonusLineCreateManyInput[] = [];
    const pushBonuses = (
      typeId: number,
      kind: Kind,
      skillTypeId: number,
      list: BonusBody[] | undefined,
    ) => {
      (list ?? []).forEach((body, sequence) => {
        lines.push({
          typeId,
          kind,
          skillTypeId,
          sequence,
          bonus: optionalNumber(body.bonus),
          bonusText: enString(body.bonusText),
          importance: optionalNumber(body.importance),
          unitId: optionalNumber(body.unitID),
          isDeleted: false,
        });
      });
    };
    for (const [key, value] of Object.entries(data)) {
      const typeId = Number(key);
      const record = value as TypeBonusRecord;
      pushBonuses(typeId, "role", 0, record.roleBonuses);
      pushBonuses(typeId, "misc", 0, record.miscBonuses);
      for (const [skillKey, list] of Object.entries(record.types ?? {})) {
        pushBonuses(typeId, "skill", Number(skillKey), list);
      }
    }

    const typeBonusLines = await ingestSdeCompositeTable({
      delegate: prisma.typeBonusLine,
      rows: lines,
      keyFields: ["typeId", "kind", "skillTypeId", "sequence"],
      scopeField: "typeId",
      scopeIds: Object.keys(data).map(Number),
    });

    return {
      stats: { typeBonuses, typeBonusLines },
      elapsed: performance.now() - start,
    };
  },
});
