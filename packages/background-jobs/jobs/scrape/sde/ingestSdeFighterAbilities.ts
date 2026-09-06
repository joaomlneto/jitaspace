import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeCompositeTable,
  ingestSdeTable,
  loadSdeFile,
  optionalNumber,
  plainString,
  requiredBoolean,
  requiredNumber,
  subRecord,
} from "../../../helpers";

export interface IngestSdeFighterAbilitiesEventPayload {
  data: Record<string, never>;
}

export interface IngestSdeFighterAbilitiesByTypeEventPayload {
  data: Record<string, never>;
}

/** fighterAbilities.yaml — the dictionary of fighter squadron abilities. */
export const ingestSdeFighterAbilities = defineJob<
  IngestSdeFighterAbilitiesEventPayload["data"]
>({
  id: "ingest-sde-fighter-abilities",
  name: "Ingest SDE Fighter Abilities",
  description:
    "Download the SDE and ingest fighterAbilities.yaml into the FighterAbility table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const fighterAbilities = await ingestSdeTable({
      filename: "fighterAbilities.yaml",
      idField: "fighterAbilityId",
      delegate: prisma.fighterAbility,
      toRow: (record, id): Prisma.FighterAbilityCreateManyInput => ({
        fighterAbilityId: id,
        displayName: enString(record.displayName) ?? "",
        tooltipText: enString(record.tooltipText),
        targetMode: plainString(record.targetMode) ?? "",
        iconId: requiredNumber(record.iconID),
        turretGraphicId: optionalNumber(record.turretGraphicID),
        disallowInHighSec: requiredBoolean(record.disallowInHighSec),
        disallowInLowSec: requiredBoolean(record.disallowInLowSec),
        isDeleted: false,
      }),
    });
    return { stats: { fighterAbilities }, elapsed: performance.now() - start };
  },
});

// The slot keys the file uses, in slot order. A future SDE could add a fourth;
// the row key is (typeId, slot), so extending this list is the only change that
// would need.
const ABILITY_SLOT_KEYS = [
  "abilitySlot0",
  "abilitySlot1",
  "abilitySlot2",
] as const;

/**
 * fighterAbilitiesByType.yaml — which ability sits in each of a fighter hull's
 * three squadron slots, with the cooldown (slot 1) and magazine (slot 2) that
 * dogma does not carry. Slot 2 is absent on the hulls that only have two
 * abilities, and its `charges` sub-object is absent on the rest.
 */
export const ingestSdeFighterAbilitiesByType = defineJob<
  IngestSdeFighterAbilitiesByTypeEventPayload["data"]
>({
  id: "ingest-sde-fighter-abilities-by-type",
  name: "Ingest SDE Fighter Abilities By Type",
  description:
    "Download the SDE and ingest fighterAbilitiesByType.yaml into the TypeFighterAbility table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const data = await loadSdeFile("fighterAbilitiesByType.yaml");

    const rows: Prisma.TypeFighterAbilityCreateManyInput[] = [];
    for (const [key, value] of Object.entries(data)) {
      const typeId = Number(key);
      const record = subRecord(value);
      ABILITY_SLOT_KEYS.forEach((slotKey, slot) => {
        if (record[slotKey] == null) return;
        const slotRecord = subRecord(record[slotKey]);
        const charges = subRecord(slotRecord.charges);
        rows.push({
          typeId,
          slot,
          fighterAbilityId: requiredNumber(slotRecord.abilityID),
          cooldownSeconds: optionalNumber(slotRecord.cooldownSeconds),
          chargeCount: optionalNumber(charges.chargeCount),
          rearmTimeSeconds: optionalNumber(charges.rearmTimeSeconds),
          isDeleted: false,
        });
      });
    }

    const typeFighterAbilities = await ingestSdeCompositeTable({
      delegate: prisma.typeFighterAbility,
      rows,
      keyFields: ["typeId", "slot"],
      scopeField: "typeId",
      scopeIds: Object.keys(data).map(Number),
    });
    return {
      stats: { typeFighterAbilities },
      elapsed: performance.now() - start,
    };
  },
});
