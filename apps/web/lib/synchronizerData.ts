import type {
  SynchronizerAttribute,
  SynchronizerModule,
  SynchronizerRig,
  SynchronizerTarget,
  TypeSynchronizer,
} from "~/lib/synchronizer";
import { prisma } from "~/lib/db";
import { resolveEffectDescription } from "~/lib/dogmaEffectDescription";
import {
  DOGMA_OPERATOR_MOD_ADD,
  DOGMA_OPERATOR_MOD_SUB,
  operatorDirection,
} from "~/lib/synchronizer";

/** Trimmed text, or undefined when absent or blank. */
function nonEmpty(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === "" ? undefined : trimmed;
}

interface TypeModifier {
  effectId: number;
  func: string;
  domain: string | null;
  operator: number | null;
  groupId: number | null;
  modifiedAttributeId: number | null;
  modifyingAttributeId: number | null;
  effect: { description: string | null; customDescription: string | null };
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
const isSelfModAdd = (modifier: TypeModifier): modifier is AttributeModifier =>
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

async function readRig(
  typeId: number,
  groupId: number,
  modifiers: TypeModifier[],
): Promise<SynchronizerRig | null> {
  const selfAdds = modifiers.filter(isSelfModAdd);
  if (selfAdds.length === 0) return null;
  const counterIds = [
    ...new Set(selfAdds.map((modifier) => modifier.modifyingAttributeId)),
  ];

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
  // A self-add nothing feeds is some other mechanic, not a synchronizer.
  if (feeders.length === 0) return null;
  // One counter per rig in the SDE; should there be more, take the fed one.
  const feederEffectIds = [...new Set(feeders.map((f) => f.effectId))];
  const amountAttributeIds = [
    ...new Set(feeders.flatMap((f) => f.modifyingAttributeId ?? [])),
  ];

  const [rigAttributes, moduleEffects] = await Promise.all([
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
                attributeId: { in: amountAttributeIds },
                isDeleted: false,
              },
            },
          },
        },
      },
      where: {
        effectId: { in: feederEffectIds },
        isDeleted: false,
        type: { published: true, isDeleted: false },
      },
    }),
  ]);

  const attributeById = new Map(
    rigAttributes.map((row) => [row.attributeId, row]),
  );
  const fedCounterId =
    counterIds.find((id) =>
      feeders.some((feeder) => feeder.modifiedAttributeId === id),
    ) ?? counterIds[0];
  if (fedCounterId === undefined) return null;
  const counter = attributeById.get(fedCounterId);

  /** What an attribute does once applied: the first effect that reads it. */
  const appliesTo = (attributeId: number) => {
    for (const modifier of modifiers) {
      if (isSelfModAdd(modifier)) continue;
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

  const scalingIds = [
    ...new Set(
      selfAdds
        .filter((modifier) => modifier.modifyingAttributeId === fedCounterId)
        .map((modifier) => modifier.modifiedAttributeId),
    ),
  ];
  const scaling = scalingIds.flatMap((id) => {
    const attribute = toAttribute(id);
    const direction = operatorDirection(
      selfAdds.find(
        (modifier) =>
          modifier.modifyingAttributeId === fedCounterId &&
          modifier.modifiedAttributeId === id,
      )?.operator ?? null,
    );
    return attribute ? [{ ...attribute, direction: direction ?? 1 }] : [];
  });

  // Everything else the rig applies through its effects. Attributes without
  // a display name are internal plumbing (the hidden damage multipliers).
  const scalingSet = new Set([...scalingIds, ...counterIds]);
  const fixedIds = [
    ...new Set(
      modifiers.flatMap((modifier) =>
        !isSelfModAdd(modifier) &&
        modifier.modifyingAttributeId !== null &&
        !scalingSet.has(modifier.modifyingAttributeId)
          ? [modifier.modifyingAttributeId]
          : [],
      ),
    ),
  ];
  const fixed = fixedIds.flatMap((id) => {
    const attribute = toAttribute(id);
    const row = attributeById.get(id);
    // Only attributes with a real display name are player-facing.
    return attribute && nonEmpty(row?.attribute.displayName) ? [attribute] : [];
  });

  const modules: SynchronizerModule[] = moduleEffects
    .map(({ type }) => ({
      typeId: type.typeId,
      name: type.name,
      groupId: type.groupId,
      groupName: type.group.name,
      amount: type.attributes[0]?.value ?? 1,
    }))
    .sort(
      (a, b) =>
        a.groupName.localeCompare(b.groupName) || a.name.localeCompare(b.name),
    );

  return {
    counterAttributeId: fedCounterId,
    counterName:
      nonEmpty(counter?.attribute.displayName) ??
      nonEmpty(counter?.attribute.name) ??
      "Matching modules fitted",
    scaling,
    fixed,
    modules,
  };
}

async function readTargets(
  typeId: number,
  modifiers: TypeModifier[],
): Promise<SynchronizerTarget[]> {
  const groupAdds = modifiers.filter(isGroupModAdd);
  if (groupAdds.length === 0) return [];

  const [ownAttributes, rigs] = await Promise.all([
    prisma.typeAttribute.findMany({
      select: { attributeId: true, value: true },
      where: {
        typeId,
        isDeleted: false,
        attributeId: {
          in: groupAdds.map((modifier) => modifier.modifyingAttributeId),
        },
      },
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
          where: {
            isDeleted: false,
            attributeId: {
              in: groupAdds.map((modifier) => modifier.modifiedAttributeId),
            },
          },
        },
      },
      where: {
        isDeleted: false,
        published: true,
        groupId: { in: groupAdds.map((modifier) => modifier.groupId) },
        attributes: {
          some: {
            isDeleted: false,
            attributeId: {
              in: groupAdds.map((modifier) => modifier.modifiedAttributeId),
            },
          },
        },
      },
      orderBy: { typeId: "asc" },
    }),
  ]);
  if (rigs.length === 0) return [];

  // Keep only counters a rig really spends on its bonuses: a group-wide add
  // onto some other attribute is a different mechanic.
  const spentCounters = new Set(
    (
      await prisma.dogmaEffectModifier.findMany({
        select: { modifyingAttributeId: true },
        where: {
          isDeleted: false,
          func: "ItemModifier",
          domain: "itemID",
          operator: { in: [DOGMA_OPERATOR_MOD_ADD, DOGMA_OPERATOR_MOD_SUB] },
          modifyingAttributeId: {
            in: groupAdds.map((modifier) => modifier.modifiedAttributeId),
          },
        },
        distinct: ["modifyingAttributeId"],
      })
    ).flatMap((row) => row.modifyingAttributeId ?? []),
  );
  const ownValue = new Map(
    ownAttributes.map((row) => [row.attributeId, row.value]),
  );

  return rigs.flatMap((rig) =>
    rig.attributes.flatMap((attribute) => {
      if (!spentCounters.has(attribute.attributeId)) return [];
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
            "Matching modules fitted",
          amount: ownValue.get(add.modifyingAttributeId) ?? 1,
        },
      ];
    }),
  );
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
