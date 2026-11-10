import type {
  SynchronizerAttribute,
  SynchronizerDirection,
  SynchronizerModule,
  SynchronizerRig,
  SynchronizerSkill,
  SynchronizerTarget,
  TypeSynchronizer,
} from "~/lib/synchronizer";
import { prisma } from "~/lib/db";
import { resolveEffectDescription } from "~/lib/dogmaEffectDescription";
import {
  DOGMA_OPERATOR_MOD_ADD,
  DOGMA_OPERATOR_MOD_SUB,
  DOGMA_OPERATOR_POST_PERCENT,
  operatorDirection,
} from "~/lib/synchronizer";

/** The inventory category of skills. */
const SKILL_CATEGORY_ID = 16;
/** The `skillLevel` attribute: a skill's trained level. */
const SKILL_LEVEL_ATTRIBUTE_ID = 280;
/** Dogma operator 0: multiply the modified attribute before anything else. */
const DOGMA_OPERATOR_PRE_MUL = 0;
const FALLBACK_COUNTER_NAME = "Matching modules fitted";

/** Trimmed text, or undefined when absent or blank. */
function nonEmpty(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === "" ? undefined : trimmed;
}

/** A modifier of one of the type's own effects. */
export interface TypeModifier {
  effectId: number;
  func: string;
  domain: string | null;
  operator: number | null;
  groupId: number | null;
  modifiedAttributeId: number | null;
  modifyingAttributeId: number | null;
  effect: { description: string | null; customDescription: string | null };
}

/** A modifier that moves one attribute by another. */
type AttributeModifier = TypeModifier & {
  modifiedAttributeId: number;
  modifyingAttributeId: number;
};

/** One that does so on every item of a group. */
type GroupAttributeModifier = AttributeModifier & { groupId: number };

/**
 * A rig adding one of its attributes (the counter) to its own bonuses, or
 * subtracting it from those stored as negative percentages.
 */
const isSelfCounterModifier = (
  modifier: TypeModifier,
): modifier is AttributeModifier =>
  modifier.func === "ItemModifier" &&
  modifier.domain === "itemID" &&
  operatorDirection(modifier.operator) !== null &&
  modifier.modifiedAttributeId !== null &&
  modifier.modifyingAttributeId !== null;

/** A module adding one of its attributes to every fitted rig of a group. */
const isGroupModAdd = (
  modifier: TypeModifier,
): modifier is GroupAttributeModifier =>
  modifier.func === "LocationGroupModifier" &&
  modifier.domain === "shipID" &&
  modifier.operator === DOGMA_OPERATOR_MOD_ADD &&
  modifier.groupId !== null &&
  modifier.modifiedAttributeId !== null &&
  modifier.modifyingAttributeId !== null;

/** A modifier, elsewhere in the SDE, that adds to a rig group's counter. */
export interface FeederModifier {
  effectId: number;
  modifiedAttributeId: number | null;
  modifyingAttributeId: number | null;
}

/** Which of a rig's attributes the counter moves, and which it leaves. */
export interface RigClassification {
  counterAttributeId: number;
  /** Bonus attribute id → whether the counter is added or subtracted. */
  scaling: Map<number, SynchronizerDirection>;
  /** Other attributes the rig's effects apply, in effect order. */
  fixedIds: number[];
  /** Effects that feed the counter: every module carrying one counts. */
  feederEffectIds: number[];
  /** The module attributes holding how much each one adds. */
  amountAttributeIds: number[];
}

/**
 * Read the synchronizer chain off a rig's own modifiers and those that feed it.
 * Null when the type is not a synchronizer: no counter, or one nothing feeds.
 */
export function classifyRig(
  modifiers: readonly TypeModifier[],
  feeders: readonly FeederModifier[],
): RigClassification | null {
  const selfCounters = modifiers.filter(isSelfCounterModifier);
  const counterIds = [
    ...new Set(selfCounters.map((modifier) => modifier.modifyingAttributeId)),
  ];
  // One counter per rig in the SDE; should there be more, take the fed one.
  const counterAttributeId = counterIds.find((id) =>
    feeders.some((feeder) => feeder.modifiedAttributeId === id),
  );
  if (counterAttributeId === undefined) return null;
  const fed = feeders.filter(
    (feeder) => feeder.modifiedAttributeId === counterAttributeId,
  );

  const scaling = new Map<number, SynchronizerDirection>();
  for (const modifier of selfCounters) {
    if (modifier.modifyingAttributeId !== counterAttributeId) continue;
    const direction = operatorDirection(modifier.operator);
    if (direction !== null && !scaling.has(modifier.modifiedAttributeId)) {
      scaling.set(modifier.modifiedAttributeId, direction);
    }
  }

  // Everything else the rig applies through its effects.
  const excluded = new Set([...scaling.keys(), ...counterIds]);
  const fixedIds = [
    ...new Set(
      modifiers.flatMap((modifier) =>
        !isSelfCounterModifier(modifier) &&
        modifier.modifyingAttributeId !== null &&
        !excluded.has(modifier.modifyingAttributeId)
          ? [modifier.modifyingAttributeId]
          : [],
      ),
    ),
  ];

  return {
    counterAttributeId,
    scaling,
    fixedIds,
    feederEffectIds: [...new Set(fed.map((feeder) => feeder.effectId))],
    amountAttributeIds: [
      ...new Set(fed.flatMap((feeder) => feeder.modifyingAttributeId ?? [])),
    ],
  };
}

/** One of the rig's attribute rows, with its presentation metadata. */
export interface RigAttributeRow {
  attributeId: number;
  value: number;
  attribute: {
    name: string | null;
    displayName: string | null;
    unitId: number | null;
    DogmaUnit: { displayName: string | null; name: string | null } | null;
  };
}

/** A published module carrying a feeder effect, with its amount, if set. */
export interface ModuleRow {
  typeId: number;
  name: string;
  groupId: number;
  group: { name: string };
  attributes: { value: number }[];
}

/** A skill modifier on the rig group, with the skill's per-level amount. */
export interface RigSkillRow {
  attributeId: number;
  skill: SynchronizerSkill;
}

/** Turn a classified rig and its rows into what the page shows. */
export function assembleRig(input: {
  classification: RigClassification;
  modifiers: readonly TypeModifier[];
  rigAttributes: readonly RigAttributeRow[];
  modules: readonly ModuleRow[];
  /** `defaultValue` of the counter and amount attributes, by id. */
  attributeDefaults: ReadonlyMap<number, number>;
  skills: readonly RigSkillRow[];
}): SynchronizerRig {
  const { classification, modifiers, rigAttributes, attributeDefaults } = input;
  const attributeById = new Map(
    rigAttributes.map((row) => [row.attributeId, row]),
  );

  /** What an attribute does once applied: the first effect that reads it. */
  const appliesTo = (attributeId: number) => {
    for (const modifier of modifiers) {
      if (isSelfCounterModifier(modifier)) continue;
      if (modifier.modifyingAttributeId !== attributeId) continue;
      const description = resolveEffectDescription(
        modifier.effect.description,
        modifier.effect.customDescription,
      );
      if (description) return description;
    }
    return undefined;
  };

  const toAttribute = (
    attributeId: number,
  ): SynchronizerAttribute | undefined => {
    const row = attributeById.get(attributeId);
    if (!row) return undefined;
    const name =
      nonEmpty(row.attribute.displayName) ?? nonEmpty(row.attribute.name);
    if (!name) return undefined;
    return {
      attributeId,
      name,
      unitId: row.attribute.unitId ?? undefined,
      unitSymbol:
        nonEmpty(row.attribute.DogmaUnit?.displayName) ??
        nonEmpty(row.attribute.DogmaUnit?.name),
      base: row.value,
      appliesTo: appliesTo(attributeId),
    };
  };

  const scaling = [...classification.scaling].flatMap(([id, direction]) => {
    const attribute = toAttribute(id);
    return attribute ? [{ ...attribute, direction }] : [];
  });

  const fixed = classification.fixedIds.flatMap((id) => {
    const attribute = toAttribute(id);
    // Attributes without a display name are internal plumbing (the hidden
    // damage multipliers), not something a player reads.
    if (!attribute || !nonEmpty(attributeById.get(id)?.attribute.displayName)) {
      return [];
    }
    const skills = input.skills
      .filter((row) => row.attributeId === id)
      .map((row) => row.skill);
    return [skills.length > 0 ? { ...attribute, skills } : attribute];
  });

  // A module without the amount attribute takes the attribute's default, as
  // dogma does.
  const amountDefault =
    classification.amountAttributeIds
      .map((id) => attributeDefaults.get(id))
      .find((value) => value !== undefined) ?? 0;
  const modules: SynchronizerModule[] = input.modules
    .map((type) => ({
      typeId: type.typeId,
      name: type.name,
      groupId: type.groupId,
      groupName: type.group.name,
      amount: type.attributes[0]?.value ?? amountDefault,
    }))
    .sort(
      (a, b) =>
        a.groupName.localeCompare(b.groupName) || a.name.localeCompare(b.name),
    );

  const counter = attributeById.get(classification.counterAttributeId);
  return {
    counterAttributeId: classification.counterAttributeId,
    counterName:
      nonEmpty(counter?.attribute.displayName) ??
      nonEmpty(counter?.attribute.name) ??
      FALLBACK_COUNTER_NAME,
    counterBase:
      counter?.value ??
      attributeDefaults.get(classification.counterAttributeId) ??
      0,
    scaling,
    fixed,
    modules,
  };
}

/** Skills that change the rig group's `fixedIds` by a percentage per level. */
async function readRigSkills(
  groupId: number,
  fixedIds: readonly number[],
): Promise<RigSkillRow[]> {
  if (fixedIds.length === 0) return [];
  const skillTypeFilter = {
    isDeleted: false,
    type: {
      published: true,
      isDeleted: false,
      group: { categoryId: SKILL_CATEGORY_ID },
    },
  };
  const modifiers = await prisma.dogmaEffectModifier.findMany({
    select: {
      modifiedAttributeId: true,
      modifyingAttributeId: true,
      effect: {
        select: {
          TypeEffect: {
            select: { type: { select: { typeId: true, name: true } } },
            where: skillTypeFilter,
          },
        },
      },
    },
    where: {
      isDeleted: false,
      func: "LocationGroupModifier",
      groupId,
      operator: DOGMA_OPERATOR_POST_PERCENT,
      modifiedAttributeId: { in: [...fixedIds] },
      effect: { isDeleted: false, TypeEffect: { some: skillTypeFilter } },
    },
  });
  const candidates = modifiers.flatMap((modifier) => {
    const attributeId = modifier.modifiedAttributeId;
    const amountAttributeId = modifier.modifyingAttributeId;
    if (attributeId === null || amountAttributeId === null) return [];
    return modifier.effect.TypeEffect.map(({ type }) => ({
      attributeId,
      amountAttributeId,
      typeId: type.typeId,
      name: type.name,
    }));
  });
  if (candidates.length === 0) return [];

  const skillIds = [...new Set(candidates.map((c) => c.typeId))];
  const amountIds = [...new Set(candidates.map((c) => c.amountAttributeId))];
  const [amounts, perLevel] = await Promise.all([
    prisma.typeAttribute.findMany({
      select: { typeId: true, attributeId: true, value: true },
      where: {
        isDeleted: false,
        typeId: { in: skillIds },
        attributeId: { in: amountIds },
      },
    }),
    // The amount only counts per level when the skill multiplies it by its
    // own skillLevel first.
    prisma.dogmaEffectModifier.findMany({
      select: {
        modifiedAttributeId: true,
        effect: {
          select: {
            TypeEffect: {
              select: { typeId: true },
              where: { isDeleted: false, typeId: { in: skillIds } },
            },
          },
        },
      },
      where: {
        isDeleted: false,
        func: "ItemModifier",
        operator: DOGMA_OPERATOR_PRE_MUL,
        modifyingAttributeId: SKILL_LEVEL_ATTRIBUTE_ID,
        modifiedAttributeId: { in: amountIds },
      },
    }),
  ]);
  return assembleRigSkills(candidates, amounts, perLevel);
}

/** Keep the skill modifiers that really scale per level, with their amount. */
export function assembleRigSkills(
  candidates: readonly {
    attributeId: number;
    amountAttributeId: number;
    typeId: number;
    name: string;
  }[],
  amounts: readonly { typeId: number; attributeId: number; value: number }[],
  perLevel: readonly {
    modifiedAttributeId: number | null;
    effect: { TypeEffect: { typeId: number }[] };
  }[],
): RigSkillRow[] {
  return candidates.flatMap((candidate) => {
    const scalesPerLevel = perLevel.some(
      (row) =>
        row.modifiedAttributeId === candidate.amountAttributeId &&
        row.effect.TypeEffect.some((te) => te.typeId === candidate.typeId),
    );
    const amount = amounts.find(
      (row) =>
        row.typeId === candidate.typeId &&
        row.attributeId === candidate.amountAttributeId,
    );
    if (!scalesPerLevel || !amount) return [];
    return [
      {
        attributeId: candidate.attributeId,
        skill: {
          typeId: candidate.typeId,
          name: candidate.name,
          percentPerLevel: amount.value,
        },
      },
    ];
  });
}

/** Every live modifier of every live effect the type has. */
function readTypeModifiers(typeId: number): Promise<TypeModifier[]> {
  return prisma.dogmaEffectModifier.findMany({
    select: {
      effectId: true,
      func: true,
      domain: true,
      operator: true,
      groupId: true,
      modifiedAttributeId: true,
      modifyingAttributeId: true,
      effect: { select: { description: true, customDescription: true } },
    },
    where: {
      isDeleted: false,
      effect: {
        isDeleted: false,
        TypeEffect: { some: { typeId, isDeleted: false } },
      },
    },
    orderBy: [{ effectId: "asc" }, { modifierIndex: "asc" }],
  });
}

async function readRig(
  typeId: number,
  groupId: number,
  modifiers: TypeModifier[],
): Promise<SynchronizerRig | null> {
  const counterIds = [
    ...new Set(
      modifiers
        .filter(isSelfCounterModifier)
        .map((modifier) => modifier.modifyingAttributeId),
    ),
  ];
  if (counterIds.length === 0) return null;

  // Who feeds the counter: modules that add to it on every rig of this group.
  const feeders = await prisma.dogmaEffectModifier.findMany({
    select: {
      effectId: true,
      modifiedAttributeId: true,
      modifyingAttributeId: true,
    },
    where: {
      isDeleted: false,
      func: "LocationGroupModifier",
      operator: DOGMA_OPERATOR_MOD_ADD,
      groupId,
      modifiedAttributeId: { in: counterIds },
    },
  });
  const classification = classifyRig(modifiers, feeders);
  if (!classification) return null;

  const [rigAttributes, moduleEffects, attributeDefaults, skills] =
    await Promise.all([
      prisma.typeAttribute.findMany({
        select: {
          attributeId: true,
          value: true,
          attribute: {
            select: {
              name: true,
              displayName: true,
              unitId: true,
              DogmaUnit: { select: { displayName: true, name: true } },
            },
          },
        },
        where: { typeId, isDeleted: false },
      }),
      prisma.typeEffect.findMany({
        select: {
          type: {
            select: {
              typeId: true,
              name: true,
              groupId: true,
              group: { select: { name: true } },
              attributes: {
                select: { value: true },
                where: {
                  attributeId: { in: classification.amountAttributeIds },
                  isDeleted: false,
                },
              },
            },
          },
        },
        where: {
          effectId: { in: classification.feederEffectIds },
          isDeleted: false,
          type: { published: true, isDeleted: false },
        },
      }),
      prisma.dogmaAttribute.findMany({
        select: { attributeId: true, defaultValue: true },
        where: {
          attributeId: {
            in: [
              classification.counterAttributeId,
              ...classification.amountAttributeIds,
            ],
          },
        },
      }),
      readRigSkills(groupId, classification.fixedIds),
    ]);

  return assembleRig({
    classification,
    modifiers,
    rigAttributes,
    // A module may carry several feeder effects; list it once.
    modules: [
      ...new Map(
        moduleEffects.map(({ type }) => [type.typeId, type] as const),
      ).values(),
    ],
    attributeDefaults: new Map(
      attributeDefaults.flatMap((row) =>
        row.defaultValue === null ? [] : [[row.attributeId, row.defaultValue]],
      ),
    ),
    skills,
  });
}

/** A rig carrying a counter some module adds to. */
export interface TargetRigRow {
  typeId: number;
  name: string;
  groupId: number;
  attributes: {
    attributeId: number;
    attribute: { displayName: string | null; name: string | null };
  }[];
}

/** The rigs a module powers, and by how much. */
export function assembleTargets(input: {
  modifiers: readonly TypeModifier[];
  /** The module's own values of the attributes it adds. */
  ownAttributes: readonly { attributeId: number; value: number }[];
  rigs: readonly TargetRigRow[];
  /** Counters some rig really spends on its bonuses. */
  spentCounters: ReadonlySet<number>;
  attributeDefaults: ReadonlyMap<number, number>;
}): SynchronizerTarget[] {
  const groupAdds = input.modifiers.filter(isGroupModAdd);
  const ownValue = new Map(
    input.ownAttributes.map((row) => [row.attributeId, row.value]),
  );
  return input.rigs.flatMap((rig) =>
    rig.attributes.flatMap((attribute) => {
      if (!input.spentCounters.has(attribute.attributeId)) return [];
      const add = groupAdds.find(
        (modifier) =>
          modifier.groupId === rig.groupId &&
          modifier.modifiedAttributeId === attribute.attributeId,
      );
      if (!add) return [];
      return [
        {
          typeId: rig.typeId,
          name: rig.name,
          counterName:
            nonEmpty(attribute.attribute.displayName) ??
            nonEmpty(attribute.attribute.name) ??
            FALLBACK_COUNTER_NAME,
          amount:
            ownValue.get(add.modifyingAttributeId) ??
            input.attributeDefaults.get(add.modifyingAttributeId) ??
            0,
        },
      ];
    }),
  );
}

async function readTargets(
  typeId: number,
  modifiers: TypeModifier[],
): Promise<SynchronizerTarget[]> {
  const groupAdds = modifiers.filter(isGroupModAdd);
  if (groupAdds.length === 0) return [];
  const amountIds = groupAdds.map((modifier) => modifier.modifyingAttributeId);
  const counterIds = groupAdds.map((modifier) => modifier.modifiedAttributeId);

  const [ownAttributes, rigs, spent, attributeDefaults] = await Promise.all([
    prisma.typeAttribute.findMany({
      select: { attributeId: true, value: true },
      where: { typeId, isDeleted: false, attributeId: { in: amountIds } },
    }),
    // Rigs carrying the counter this module adds to.
    prisma.type.findMany({
      select: {
        typeId: true,
        name: true,
        groupId: true,
        attributes: {
          select: {
            attributeId: true,
            attribute: { select: { displayName: true, name: true } },
          },
          where: { isDeleted: false, attributeId: { in: counterIds } },
        },
      },
      where: {
        isDeleted: false,
        published: true,
        groupId: { in: groupAdds.map((modifier) => modifier.groupId) },
        attributes: {
          some: { isDeleted: false, attributeId: { in: counterIds } },
        },
      },
      orderBy: { typeId: "asc" },
    }),
    // Keep only counters a rig really spends on its bonuses: a group-wide add
    // onto some other attribute is a different mechanic.
    prisma.dogmaEffectModifier.findMany({
      select: { modifyingAttributeId: true },
      where: {
        isDeleted: false,
        func: "ItemModifier",
        domain: "itemID",
        operator: { in: [DOGMA_OPERATOR_MOD_ADD, DOGMA_OPERATOR_MOD_SUB] },
        modifyingAttributeId: { in: counterIds },
      },
      distinct: ["modifyingAttributeId"],
    }),
    prisma.dogmaAttribute.findMany({
      select: { attributeId: true, defaultValue: true },
      where: { attributeId: { in: amountIds } },
    }),
  ]);
  if (rigs.length === 0) return [];

  return assembleTargets({
    modifiers,
    ownAttributes,
    rigs,
    spentCounters: new Set(
      spent.flatMap((row) => row.modifyingAttributeId ?? []),
    ),
    attributeDefaults: new Map(
      attributeDefaults.flatMap((row) =>
        row.defaultValue === null ? [] : [[row.attributeId, row.defaultValue]],
      ),
    ),
  });
}

/**
 * A type's part in the synchronizer chain (see `~/lib/synchronizer`): the rig's
 * scaling bonuses and the modules that feed them, or the rigs a module feeds.
 * Most types are neither, which costs one query: the type's modifiers.
 *
 * Throws on a database failure; the caller decides how to degrade.
 */
export async function readTypeSynchronizer(
  typeId: number,
  groupId: number,
): Promise<TypeSynchronizer> {
  const modifiers = await readTypeModifiers(typeId);
  const [rig, countsTowards] = await Promise.all([
    readRig(typeId, groupId, modifiers),
    readTargets(typeId, modifiers),
  ]);
  return { rig, countsTowards };
}
