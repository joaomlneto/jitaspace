/**
 * Writes plain-language descriptions of dogma effects into
 * `DogmaEffect.customDescription`, for effects whose CCP description is empty
 * or the "Automatically generated effect" placeholder. Claude Opus 5.5 writes
 * them from each effect's modifiers; the effect and item pages show them,
 * labelled AI-generated, wherever CCP's own text is missing.
 *
 *   pnpm --filter @jitaspace/background-jobs describe-dogma-effects <command>
 *
 * Commands (count, payload, sample, submit, collect, write) are documented in
 * scripts/lib/describeWithClaude.ts.
 *
 * What a description may say, learned with the site owner:
 * - what changes, on which items, in which direction, and how it scales with
 *   skills — but never the items that carry the effect, nor any values: the
 *   effect page lists every carrier with its own value;
 * - plain text plus links (<a href="showinfo:TYPEID">, or a site path for a
 *   group, attribute or effect), and only to ids found in the input.
 */

import type { EffectInput, Ref } from "../utils/dogmaEffectDescriptions";
import type { Describer } from "./lib/describeWithClaude";
import { prisma } from "../db";
import {
  BOILERPLATE,
  checkDescription,
  directionOf,
  label,
  OPERATIONS,
  SKILL_CATEGORY_ID,
  SYSTEM_PROMPT,
} from "../utils/dogmaEffectDescriptions";
import { runDescriber } from "./lib/describeWithClaude";
import { readSkillScaling } from "./lib/skillScaling";

/** The model's input for each effect, from the database. */
async function loadInputs(effectIds: number[]): Promise<EffectInput[]> {
  const effects = await prisma.dogmaEffect.findMany({
    where: { effectId: { in: effectIds } },
    select: {
      effectId: true,
      name: true,
      displayName: true,
      effectCategory: { select: { name: true } },
      isOffensive: true,
      isAssistance: true,
      isWarpSafe: true,
      disallowAutoRepeat: true,
      electronicChance: true,
      propulsionChance: true,
      rangeChance: true,
      dischargeAttributeId: true,
      durationAttributeId: true,
      rangeAttributeId: true,
      falloffAttributeId: true,
      trackingSpeedAttributeId: true,
    },
  });
  const modifiers = await prisma.dogmaEffectModifier.findMany({
    where: { effectId: { in: effectIds }, isDeleted: false },
    orderBy: [{ effectId: "asc" }, { modifierIndex: "asc" }],
    select: {
      effectId: true,
      func: true,
      domain: true,
      operator: true,
      modifiedAttributeId: true,
      modifyingAttributeId: true,
      groupId: true,
      group: { select: { name: true } },
      skillTypeId: true,
      targetEffectId: true,
      targetEffect: { select: { name: true, displayName: true } },
    },
  });
  const carriers = await prisma.typeEffect.findMany({
    where: { effectId: { in: effectIds }, isDeleted: false },
    select: {
      effectId: true,
      typeId: true,
      type: {
        select: { published: true, group: { select: { categoryId: true } } },
      },
    },
  });

  const attributeIds = new Set<number>();
  for (const e of effects) {
    for (const id of [
      e.dischargeAttributeId,
      e.durationAttributeId,
      e.rangeAttributeId,
      e.falloffAttributeId,
      e.trackingSpeedAttributeId,
    ]) {
      if (id !== null) attributeIds.add(id);
    }
  }
  const modifyingIds = new Set<number>();
  for (const m of modifiers) {
    if (m.modifiedAttributeId !== null) attributeIds.add(m.modifiedAttributeId);
    if (m.modifyingAttributeId !== null) {
      attributeIds.add(m.modifyingAttributeId);
      modifyingIds.add(m.modifyingAttributeId);
    }
  }

  const [attributes, skills, values, scaledBy] = await Promise.all([
    prisma.dogmaAttribute.findMany({
      where: { attributeId: { in: [...attributeIds] } },
      select: {
        attributeId: true,
        name: true,
        displayName: true,
        unitId: true,
      },
    }),
    prisma.type.findMany({
      where: {
        typeId: {
          in: modifiers.flatMap((m) =>
            m.skillTypeId === null ? [] : [m.skillTypeId],
          ),
        },
      },
      select: { typeId: true, name: true },
    }),
    prisma.typeAttribute.findMany({
      where: {
        attributeId: { in: [...modifyingIds] },
        isDeleted: false,
        type: {
          effects: { some: { effectId: { in: effectIds }, isDeleted: false } },
        },
      },
      select: { typeId: true, attributeId: true, value: true },
    }),
    readSkillScaling([...modifyingIds]),
  ]);

  const attributeById = new Map(attributes.map((a) => [a.attributeId, a]));
  const attributeRef = (id: number | null): Ref | null => {
    if (id === null) return null;
    const a = attributeById.get(id);
    return { id, name: a ? label(a.displayName, a.name, id) : `#${id}` };
  };
  const skillName = new Map(skills.map((s) => [s.typeId, s.name]));
  const valuesByType = new Map<string, number>(
    values.map((v) => [`${v.typeId}:${v.attributeId}`, v.value]),
  );

  return effects.map((e): EffectInput => {
    const own = carriers.filter((c) => c.effectId === e.effectId);
    // Values that count: published carriers' non-zero values, or every
    // carrier's when none is published (NPC-only effects).
    const counted = (attributeId: number): number[] => {
      const all = own.flatMap((c) => {
        const v = valuesByType.get(`${c.typeId}:${attributeId}`);
        return v === undefined || v === 0
          ? []
          : [{ published: c.type.published, v }];
      });
      const published = all.filter((x) => x.published);
      return (published.length > 0 ? published : all).map((x) => x.v);
    };
    const uses: Record<string, Ref> = {};
    const stat = (key: string, id: number | null) => {
      const ref = attributeRef(id);
      if (ref) uses[key] = ref;
    };
    stat("activation cost", e.dischargeAttributeId);
    stat("cycle time", e.durationAttributeId);
    stat("optimal range", e.rangeAttributeId);
    stat("falloff", e.falloffAttributeId);
    stat("tracking", e.trackingSpeedAttributeId);

    return {
      effectId: e.effectId,
      effect: {
        internalName: e.name,
        displayName: e.displayName,
        category: e.effectCategory?.name.replace(/^dgmEff/, "") ?? null,
        trueFlags: Object.entries({
          isOffensive: e.isOffensive,
          isAssistance: e.isAssistance,
          isWarpSafe: e.isWarpSafe,
          disallowAutoRepeat: e.disallowAutoRepeat,
          electronicChance: e.electronicChance,
          propulsionChance: e.propulsionChance,
          rangeChance: e.rangeChance,
        }).flatMap(([key, value]) => (value === true ? [key] : [])),
        usesAttributes: uses,
      },
      modifiers: modifiers
        .filter((m) => m.effectId === e.effectId)
        .map((m) => ({
          func: m.func,
          domain: m.domain,
          operation:
            m.operator === null
              ? null
              : (OPERATIONS[m.operator] ?? `operator ${m.operator}`),
          modifiedAttribute: attributeRef(m.modifiedAttributeId),
          modifyingAttribute: attributeRef(m.modifyingAttributeId),
          direction: directionOf(
            m.operator,
            m.modifyingAttributeId === null
              ? []
              : counted(m.modifyingAttributeId),
            m.modifiedAttributeId === null
              ? null
              : (attributeById.get(m.modifiedAttributeId)?.unitId ?? null),
          ),
          scalesWithSkills:
            m.modifyingAttributeId === null
              ? []
              : (scaledBy.get(m.modifyingAttributeId) ?? []),
          group:
            m.groupId === null
              ? null
              : { id: m.groupId, name: m.group?.name ?? `#${m.groupId}` },
          skill:
            m.skillTypeId === null
              ? null
              : {
                  id: m.skillTypeId,
                  name: skillName.get(m.skillTypeId) ?? `#${m.skillTypeId}`,
                },
          stoppedEffect:
            m.targetEffectId === null
              ? null
              : {
                  id: m.targetEffectId,
                  name: label(
                    m.targetEffect?.displayName ?? null,
                    m.targetEffect?.name ?? null,
                    m.targetEffectId,
                  ),
                },
        })),
      itemsAreSkills:
        own.length > 0 &&
        own.every((c) => c.type.group.categoryId === SKILL_CATEGORY_ID),
    };
  });
}

/** Effects with modifiers and no real CCP description. */
async function candidateIds(includeDescribed: boolean): Promise<number[]> {
  const rows = await prisma.dogmaEffect.findMany({
    where: {
      isDeleted: false,
      DogmaEffectModifiers: { some: { isDeleted: false } },
      ...(includeDescribed ? {} : { customDescription: null }),
    },
    select: { effectId: true, description: true },
    orderBy: { effectId: "asc" },
  });
  return rows
    .filter((r) => {
      const d = r.description?.trim() ?? "";
      return d === "" || d === BOILERPLATE;
    })
    .map((r) => r.effectId);
}

const describer: Describer<EffectInput> = {
  noun: "effect",
  table: "DogmaEffect",
  idColumn: "effectId",
  systemPrompt: SYSTEM_PROMPT,
  idOf: (input) => input.effectId,
  userContent: (input) => ({
    effect: input.effect,
    modifiers: input.modifiers,
    itemsAreSkills: input.itemsAreSkills,
  }),
  check: checkDescription,
  loadInputs,
  candidateIds,
};

await runDescriber(describer, process.argv.slice(2));
