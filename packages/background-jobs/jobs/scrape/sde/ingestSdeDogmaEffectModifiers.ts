import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { ingestSdeCompositeTable, loadSdeFile } from "../../../helpers";

export interface IngestSdeDogmaEffectModifiersEventPayload {
  data: Record<string, never>;
}

interface ModifierInfoRecord {
  domain?: string;
  effectID?: number;
  func?: string;
  groupID?: number;
  modifiedAttributeID?: number;
  modifyingAttributeID?: number;
  operation?: number;
  skillTypeID?: number;
}

/**
 * The `modifierInfo` array on each dogmaEffects.yaml record, flattened into the
 * DogmaEffectModifier table. `ingestSdeDogmaEffects` deliberately leaves this
 * array alone (it only writes the effect's own scalar columns), so this job owns
 * the table on its own — hence the default soft-delete, which retires modifiers
 * dropped from an effect between SDE releases.
 *
 * The key is (effectId, modifierIndex): modifiers have no id of their own, so
 * their position in the array identifies them. The referenced DogmaEffect rows
 * are assumed to exist, which is why this runs after `ingest-sde-dogma-effects`
 * in the pipeline.
 */
export const ingestSdeDogmaEffectModifiers = defineJob<
  IngestSdeDogmaEffectModifiersEventPayload["data"]
>({
  id: "ingest-sde-dogma-effect-modifiers",
  name: "Ingest SDE Dogma Effect Modifiers",
  description:
    "Download the SDE and ingest the modifierInfo entries of dogmaEffects.yaml into the DogmaEffectModifier table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();

    const data = await loadSdeFile("dogmaEffects.yaml");
    const entries = Object.entries(data).map(([key, record]) => ({
      effectId: Number(key),
      modifiers:
        (record as { modifierInfo?: ModifierInfoRecord[] }).modifierInfo ?? [],
    }));

    // Every effect id is in scope, not just the ones that currently have
    // modifiers: an effect whose `modifierInfo` was emptied must still have its
    // stale rows soft-deleted, and that only happens if its id bounds the diff.
    const effectIds = entries.map((entry) => entry.effectId);

    const rows: Prisma.DogmaEffectModifierCreateManyInput[] = entries.flatMap(
      ({ effectId, modifiers }) =>
        modifiers.map((modifier, modifierIndex) => ({
          effectId,
          modifierIndex,
          domain: modifier.domain ?? null,
          targetEffectId: modifier.effectID ?? null,
          // `func` is the one non-nullable column here; every modifier in the
          // SDE carries it, so the fallback is only a guard against a malformed
          // record rather than an expected case.
          func: modifier.func ?? "",
          modifiedAttributeId: modifier.modifiedAttributeID ?? null,
          modifyingAttributeId: modifier.modifyingAttributeID ?? null,
          operator: modifier.operation ?? null,
          groupId: modifier.groupID ?? null,
          skillTypeId: modifier.skillTypeID ?? null,
          isDeleted: false,
        })),
    );

    const dogmaEffectModifiers = await ingestSdeCompositeTable({
      delegate: prisma.dogmaEffectModifier,
      rows,
      keyFields: ["effectId", "modifierIndex"],
      scopeField: "effectId",
      scopeIds: effectIds,
    });

    return {
      stats: { dogmaEffectModifiers },
      elapsed: performance.now() - start,
    };
  },
});
