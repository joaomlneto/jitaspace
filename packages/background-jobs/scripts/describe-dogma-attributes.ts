/**
 * Writes plain-language descriptions of dogma attributes into
 * `DogmaAttribute.customDescription`, for every attribute in use: one an item
 * carries, or that an effect modifier changes or reads. Claude Opus 5.5 writes
 * them from the attribute's data; the attribute page shows them first,
 * labelled AI-generated, next to CCP's own tooltip and note.
 *
 *   pnpm --filter @jitaspace/background-jobs describe-dogma-attributes <command>
 *
 * Commands (count, payload, sample, submit, collect, write) are documented in
 * scripts/lib/describeWithClaude.ts. The rules a description follows are in
 * utils/dogmaAttributeDescriptions.ts.
 */
import type {
  AttributeInput,
  AttributeModifierInput,
} from "../utils/dogmaAttributeDescriptions";
import type { Ref } from "../utils/dogmaEffectDescriptions";
import type { Describer } from "./lib/describeWithClaude";
import { prisma } from "../db";
import {
  ATTRIBUTE_SYSTEM_PROMPT,
  checkAttributeDescription,
} from "../utils/dogmaAttributeDescriptions";
import { label, OPERATIONS } from "../utils/dogmaEffectDescriptions";
import { runDescriber } from "./lib/describeWithClaude";
import { readSkillScaling } from "./lib/skillScaling";

/** Trimmed text, or null when absent or blank. */
function nonEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed;
}

/** The SDE's catch-all attribute category is literally named "NULL". */
const categoryName = (name: string | undefined) =>
  name === undefined || name === "NULL" ? null : name;

/** How many modifiers and stat uses of each kind the model sees. */
const MAX_LISTED = 12;

const STAT_ROLES = {
  dischargeAttributeId: "activation cost",
  durationAttributeId: "cycle time",
  rangeAttributeId: "optimal range",
  falloffAttributeId: "falloff",
  trackingSpeedAttributeId: "tracking",
  resistanceAttributeId: "resisted by",
  npcUsageChanceAttributeId: "NPC usage chance",
  npcActivationChanceAttributeId: "NPC activation chance",
  fittingUsageChanceAttributeId: "side-effect chance",
} as const;
const STAT_ROLE_KEYS = Object.keys(STAT_ROLES) as (keyof typeof STAT_ROLES)[];

const MODIFIER_SELECT = {
  effectId: true,
  func: true,
  domain: true,
  operator: true,
  modifiedAttributeId: true,
  modifyingAttributeId: true,
  groupId: true,
  group: { select: { name: true } },
  skillTypeId: true,
  effect: {
    select: {
      name: true,
      displayName: true,
      _count: { select: { TypeEffect: { where: { isDeleted: false } } } },
    },
  },
} as const;

async function loadInputs(attributeIds: number[]): Promise<AttributeInput[]> {
  const live = { isDeleted: false, effect: { isDeleted: false } };
  const [attributes, changedBy, changes, statEffects, kinds, scaledBy] =
    await Promise.all([
      prisma.dogmaAttribute.findMany({
        where: { attributeId: { in: attributeIds } },
        select: {
          attributeId: true,
          name: true,
          displayName: true,
          description: true,
          tooltipDescription: true,
          minAttributeId: true,
          maxAttributeId: true,
          chargeRechargeTimeId: true,
          DogmaUnit: { select: { name: true, displayName: true } },
          attributeCategory: { select: { name: true } },
        },
      }),
      prisma.dogmaEffectModifier.findMany({
        select: MODIFIER_SELECT,
        where: { ...live, modifiedAttributeId: { in: attributeIds } },
      }),
      prisma.dogmaEffectModifier.findMany({
        select: MODIFIER_SELECT,
        where: { ...live, modifyingAttributeId: { in: attributeIds } },
      }),
      prisma.dogmaEffect.findMany({
        where: {
          isDeleted: false,
          OR: STAT_ROLE_KEYS.map((key) => ({ [key]: { in: attributeIds } })),
        },
        select: {
          effectId: true,
          name: true,
          displayName: true,
          dischargeAttributeId: true,
          durationAttributeId: true,
          rangeAttributeId: true,
          falloffAttributeId: true,
          trackingSpeedAttributeId: true,
          resistanceAttributeId: true,
          npcUsageChanceAttributeId: true,
          npcActivationChanceAttributeId: true,
          fittingUsageChanceAttributeId: true,
        },
      }),
      prisma.$queryRaw<{ attributeId: number; kind: string; items: number }[]>`
        SELECT ta."attributeId", c.name AS kind, count(*)::int AS items
        FROM "TypeAttribute" ta
        JOIN "Type" t ON t."typeId" = ta."typeId"
        JOIN "Group" g ON g."groupId" = t."groupId"
        JOIN "Category" c ON c."categoryId" = g."categoryId"
        WHERE ta."attributeId" = ANY(${attributeIds}) AND NOT ta."isDeleted"
        GROUP BY 1, 2`,
      readSkillScaling(attributeIds),
    ]);

  // Names for every other attribute and skill the inputs mention.
  const otherIds = new Set<number>();
  for (const a of attributes) {
    for (const id of [
      a.minAttributeId,
      a.maxAttributeId,
      a.chargeRechargeTimeId,
    ]) {
      if (id !== null) otherIds.add(id);
    }
  }
  for (const m of [...changedBy, ...changes]) {
    if (m.modifiedAttributeId !== null) otherIds.add(m.modifiedAttributeId);
    if (m.modifyingAttributeId !== null) otherIds.add(m.modifyingAttributeId);
  }
  const [others, skills] = await Promise.all([
    prisma.dogmaAttribute.findMany({
      where: { attributeId: { in: [...otherIds] } },
      select: { attributeId: true, name: true, displayName: true },
    }),
    prisma.type.findMany({
      where: {
        typeId: {
          in: [...changedBy, ...changes].flatMap((m) =>
            m.skillTypeId === null ? [] : [m.skillTypeId],
          ),
        },
      },
      select: { typeId: true, name: true },
    }),
  ]);
  const otherById = new Map(others.map((a) => [a.attributeId, a]));
  const attributeRef = (id: number | null): Ref | null => {
    if (id === null) return null;
    const a = otherById.get(id);
    return { id, name: a ? label(a.displayName, a.name, id) : `#${id}` };
  };
  const skillName = new Map(skills.map((s) => [s.typeId, s.name]));
  const common = (m: (typeof changedBy)[number]): AttributeModifierInput => ({
    effect: {
      id: m.effectId,
      name: label(m.effect.displayName, m.effect.name, m.effectId),
    },
    func: m.func,
    domain: m.domain,
    operation:
      m.operator === null
        ? null
        : (OPERATIONS[m.operator] ?? `operator ${m.operator}`),
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
  });
  // The most widely carried effects first: they matter to the most players.
  const mostCarried = <
    T extends { effect: { _count: { TypeEffect: number } } },
  >(
    rows: T[],
  ) =>
    [...rows]
      .sort((a, b) => b.effect._count.TypeEffect - a.effect._count.TypeEffect)
      .slice(0, MAX_LISTED);

  return attributes.map((a): AttributeInput => {
    const id = a.attributeId;
    const changedByThis = changedBy.filter((m) => m.modifiedAttributeId === id);
    const changesThis = changes.filter((m) => m.modifyingAttributeId === id);
    return {
      attributeId: id,
      attribute: {
        internalName: a.name,
        displayName: nonEmpty(a.displayName),
        unit: a.DogmaUnit
          ? label(a.DogmaUnit.displayName, a.DogmaUnit.name, 0)
          : null,
        category: categoryName(a.attributeCategory?.name),
        ccpTooltip: nonEmpty(a.tooltipDescription),
        ccpNote: nonEmpty(a.description),
        minimumFrom: attributeRef(a.minAttributeId),
        maximumFrom: attributeRef(a.maxAttributeId),
        rechargeTimeFrom: attributeRef(a.chargeRechargeTimeId),
      },
      itemKinds: kinds
        .filter((k) => k.attributeId === id)
        .sort((x, y) => y.items - x.items)
        .slice(0, 6)
        .map(({ kind, items }) => ({ kind, items })),
      scaledBySkills: scaledBy.get(id) ?? [],
      changedBy: mostCarried(changedByThis).map((m) => ({
        ...common(m),
        modifyingAttribute: attributeRef(m.modifyingAttributeId),
      })),
      changedByTotal: changedByThis.length,
      changes: mostCarried(changesThis).map((m) => ({
        ...common(m),
        modifiedAttribute: attributeRef(m.modifiedAttributeId),
      })),
      changesTotal: changesThis.length,
      usedAsStatBy: statEffects
        .flatMap((e) =>
          STAT_ROLE_KEYS.filter((key) => e[key] === id).map((key) => ({
            effect: {
              id: e.effectId,
              name: label(e.displayName, e.name, e.effectId),
            },
            role: STAT_ROLES[key],
          })),
        )
        .slice(0, MAX_LISTED),
    };
  });
}

/** Attributes in use: carried by an item, or changed or read by a modifier. */
async function candidateIds(includeDescribed: boolean): Promise<number[]> {
  const rows = await prisma.dogmaAttribute.findMany({
    where: {
      isDeleted: false,
      ...(includeDescribed ? {} : { customDescription: null }),
      OR: [
        { TypeAttributes: { some: { isDeleted: false } } },
        { DogmaEffectsModified: { some: { isDeleted: false } } },
        { DogmaEffectsModifying: { some: { isDeleted: false } } },
      ],
    },
    select: { attributeId: true },
    orderBy: { attributeId: "asc" },
  });
  return rows.map((r) => r.attributeId);
}

const describer: Describer<AttributeInput> = {
  noun: "attribute",
  table: "DogmaAttribute",
  idColumn: "attributeId",
  systemPrompt: ATTRIBUTE_SYSTEM_PROMPT,
  idOf: (input) => input.attributeId,
  userContent: (input) => input,
  check: checkAttributeDescription,
  loadInputs,
  candidateIds,
};

await runDescriber(describer, process.argv.slice(2));
