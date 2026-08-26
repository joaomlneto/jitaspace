import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  ingestSdeCompositeTable,
  loadSdeFile,
  loadSdeFileIds,
  optionalNumber,
  plainString,
} from "../../../helpers";

export interface IngestSdeDogmaEffectModifiersEventPayload {
  data: Record<string, never>;
}

interface ModifierRecord {
  domain?: unknown;
  func?: unknown;
  modifiedAttributeID?: unknown;
  modifyingAttributeID?: unknown;
  operation?: unknown;
  groupID?: unknown;
  skillTypeID?: unknown;
  effectID?: unknown;
}

/**
 * dogmaEffects.yaml carries a nested `modifierInfo` list per effect, which feeds
 * the composite-key DogmaEffectModifier table (effectId, modifierIndex). The
 * SDE gives modifiers no id of their own, so identity is positional within the
 * effect's list — same key the previous SDE-API scraper used.
 *
 * Which fields a modifier carries depends on its `func`: an ItemModifier has
 * modified/modifying attributes, LocationGroupModifier adds groupID,
 * LocationRequiredSkillModifier adds skillTypeID, EffectStopper carries only
 * effectID. So everything except `func` is optional. The optional FKs are
 * guarded against the SDE's own id sets, so a dangling reference lands as null
 * instead of failing the whole insert. `skillTypeId` has no FK in the schema and
 * is stored as a plain id.
 *
 * This job owns the table outright (nothing else writes it), so the diff
 * soft-deletes modifiers the SDE has dropped.
 */
export const ingestSdeDogmaEffectModifiers = defineJob<
  IngestSdeDogmaEffectModifiersEventPayload["data"]
>({
  id: "ingest-sde-dogma-effect-modifiers",
  name: "Ingest SDE Dogma Effect Modifiers",
  description:
    "Download the SDE and ingest the modifierInfo of dogmaEffects.yaml into the DogmaEffectModifier table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();

    const dogmaEffects = await loadSdeFile("dogmaEffects.yaml");
    // Guard sets go through `loadSdeFileIds`, which keeps only the id projection
    // and shares one parse per file across every job in the pipeline.
    const [knownAttributeIds, knownGroupIds] = await Promise.all([
      loadSdeFileIds("dogmaAttributes.yaml"),
      loadSdeFileIds("groups.yaml"),
    ]);
    const knownEffectIds = new Set(Object.keys(dogmaEffects).map(Number));
    const present = (ids: ReadonlySet<number>, value: number | null) =>
      value != null && ids.has(value) ? value : null;

    const entries = Object.entries(dogmaEffects).map(([key, record]) => ({
      effectId: Number(key),
      modifiers: ((record as { modifierInfo?: unknown }).modifierInfo ??
        []) as ModifierRecord[],
    }));
    const effectIds = entries.map((entry) => entry.effectId);

    const rows: Prisma.DogmaEffectModifierCreateManyInput[] = entries.flatMap(
      ({ effectId, modifiers }) =>
        modifiers
          // `func` is what a modifier *does*; without one there is nothing to
          // apply, so drop the entry rather than store a placeholder every
          // reader would have to special-case. Indexes are assigned before the
          // filter, so the surviving rows keep their positional identity.
          .map((modifier, modifierIndex) => ({
            modifier,
            modifierIndex,
            func: plainString(modifier.func),
          }))
          .filter(
            (entry): entry is typeof entry & { func: string } =>
              entry.func !== null,
          )
          .map(({ modifier, modifierIndex, func }) => ({
            effectId,
            modifierIndex,
            domain: plainString(modifier.domain),
            targetEffectId: present(
              knownEffectIds,
              optionalNumber(modifier.effectID),
            ),
            func,
            modifiedAttributeId: present(
              knownAttributeIds,
              optionalNumber(modifier.modifiedAttributeID),
            ),
            modifyingAttributeId: present(
              knownAttributeIds,
              optionalNumber(modifier.modifyingAttributeID),
            ),
            operator: optionalNumber(modifier.operation),
            groupId: present(knownGroupIds, optionalNumber(modifier.groupID)),
            skillTypeId: optionalNumber(modifier.skillTypeID),
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
