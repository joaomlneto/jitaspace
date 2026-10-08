import type {
  DogmaAttributeInfo,
  DogmaEffectInfo,
  NpcStats,
} from "~/lib/npcStats";
import { prisma } from "~/lib/db";
import {
  computeNpcStats,
  INFERRED_EFFECT_IDS,
  MISSILE_TYPE_ATTRIBUTE_ID,
  NPC_STAT_ATTRIBUTE_IDS,
} from "~/lib/npcStats";

/** The inventory category NPCs belong to ("Entity"). */
export const NPC_CATEGORY_ID = 11;
/** The inventory category drones belong to (not fighters, which have their own). */
export const DRONE_CATEGORY_ID = 18;
/**
 * The categories whose combat figures come from their own attributes. Not
 * ships: a ship's damage comes from the modules fitted to it.
 */
export const COMBAT_STATS_CATEGORY_IDS: readonly number[] = [
  NPC_CATEGORY_ID,
  DRONE_CATEGORY_ID,
];

/** Rows grouped by type id. */
const byType = <T, V>(
  rows: readonly T[],
  typeIdOf: (row: T) => number,
  add: (into: V, row: T) => void,
  empty: () => V,
) => {
  const grouped = new Map<number, V>();
  for (const row of rows) {
    const typeId = typeIdOf(row);
    let into = grouped.get(typeId);
    if (into === undefined) {
      into = empty();
      grouped.set(typeId, into);
    }
    add(into, row);
  }
  return grouped;
};

/**
 * Each type's dogma attributes, keyed by type id: every one, or only those
 * listed. Abilities read attributes their effects name, so a type's own
 * stats take all of them; a missile's only its damage.
 */
async function readAttributes(
  typeIds: readonly number[],
  attributeIds?: readonly number[],
) {
  if (typeIds.length === 0) return new Map<number, Map<number, number>>();
  const rows = await prisma.typeAttribute.findMany({
    select: { typeId: true, attributeId: true, value: true },
    where: {
      typeId: { in: [...typeIds] },
      ...(attributeIds ? { attributeId: { in: [...attributeIds] } } : {}),
      isDeleted: false,
    },
  });
  return byType(
    rows,
    (row) => row.typeId,
    (attributes: Map<number, number>, row) =>
      attributes.set(row.attributeId, row.value),
    () => new Map<number, number>(),
  );
}

/**
 * Each type's dogma effects, as the SDE describes them, keyed by type id, and
 * the effects an old-style NPC may act on without carrying them.
 */
async function readEffects(typeIds: readonly number[]) {
  if (typeIds.length === 0) {
    return { byTypeId: new Map<number, DogmaEffectInfo[]>(), inferable: [] };
  }
  const typeEffects = await prisma.typeEffect.findMany({
    select: { typeId: true, effectId: true },
    where: { typeId: { in: [...typeIds] }, isDeleted: false },
  });
  const effectIds = [
    ...new Set([
      ...typeEffects.map((row) => row.effectId),
      ...INFERRED_EFFECT_IDS,
    ]),
  ];
  const [effects, modifiers] = await Promise.all([
    prisma.dogmaEffect.findMany({
      select: {
        effectId: true,
        name: true,
        isOffensive: true,
        isAssistance: true,
        rangeAttributeId: true,
        falloffAttributeId: true,
        durationAttributeId: true,
      },
      where: { effectId: { in: effectIds } },
    }),
    prisma.dogmaEffectModifier.findMany({
      select: { effectId: true, modifyingAttributeId: true },
      where: { effectId: { in: effectIds }, isDeleted: false },
      orderBy: [{ effectId: "asc" }, { modifierIndex: "asc" }],
    }),
  ]);
  const info = new Map<number, DogmaEffectInfo>(
    effects.map((effect) => [
      effect.effectId,
      {
        effectId: effect.effectId,
        name: effect.name ?? `effect ${effect.effectId}`,
        isOffensive: effect.isOffensive ?? false,
        isAssistance: effect.isAssistance ?? false,
        rangeAttributeId: effect.rangeAttributeId,
        falloffAttributeId: effect.falloffAttributeId,
        durationAttributeId: effect.durationAttributeId,
        modifyingAttributeIds: [
          ...new Set(
            modifiers.flatMap((m) =>
              m.effectId === effect.effectId && m.modifyingAttributeId !== null
                ? [m.modifyingAttributeId]
                : [],
            ),
          ),
        ],
      },
    ]),
  );
  return {
    byTypeId: byType(
      typeEffects,
      (row) => row.typeId,
      (list: DogmaEffectInfo[], row) => {
        const effect = info.get(row.effectId);
        if (effect) list.push(effect);
      },
      () => [] as DogmaEffectInfo[],
    ),
    inferable: INFERRED_EFFECT_IDS.flatMap((id) => {
      const effect = info.get(id);
      return effect ? [effect] : [];
    }),
  };
}

/** The names and units of the given attributes, to label ability values. */
async function readAttributeInfo(attributeIds: readonly number[]) {
  if (attributeIds.length === 0) return new Map<number, DogmaAttributeInfo>();
  const rows = await prisma.dogmaAttribute.findMany({
    select: {
      attributeId: true,
      name: true,
      displayName: true,
      unitId: true,
      DogmaUnit: { select: { name: true, displayName: true } },
    },
    where: { attributeId: { in: [...attributeIds] } },
  });
  return new Map<number, DogmaAttributeInfo>(
    rows.map((row) => [
      row.attributeId,
      {
        name: row.name ?? `attribute ${row.attributeId}`,
        displayName: row.displayName,
        unitId: row.unitId,
        unitSymbol: row.DogmaUnit?.displayName ?? row.DogmaUnit?.name ?? null,
      },
    ]),
  );
}

/**
 * Combat figures for NPC and drone types, from our SDE tables: their own dogma
 * attributes and effects (what each effect reads, and the names and units of
 * those attributes), plus the attributes of the missiles they launch (missile
 * damage lives on the missile). Types with no attributes at all are left out.
 * Not cached itself, and throws on a database error: callers wrap it in their
 * own `"use cache"` scope and decide how to degrade.
 */
export async function readNpcStats(
  typeIds: readonly number[],
): Promise<Map<number, NpcStats>> {
  const [attributes, effects] = await Promise.all([
    readAttributes(typeIds),
    readEffects(typeIds),
  ]);
  const missileTypeIds = [
    ...new Set(
      [...attributes.values()].flatMap((attrs) => {
        const id = attrs.get(MISSILE_TYPE_ATTRIBUTE_ID);
        return id === undefined ? [] : [id];
      }),
    ),
  ];
  const [missiles, attributeInfo] = await Promise.all([
    readAttributes(missileTypeIds, NPC_STAT_ATTRIBUTE_IDS),
    readAttributeInfo([
      ...new Set(
        [...attributes.values()].flatMap((attrs) => [...attrs.keys()]),
      ),
    ]),
  ]);
  return new Map(
    [...attributes].map(([typeId, attrs]) => {
      const missileTypeId = attrs.get(MISSILE_TYPE_ATTRIBUTE_ID);
      return [
        typeId,
        computeNpcStats(
          attrs,
          missileTypeId === undefined ? undefined : missiles.get(missileTypeId),
          {
            effects: effects.byTypeId.get(typeId) ?? [],
            inferableEffects: effects.inferable,
            attributeInfo,
          },
        ),
      ];
    }),
  );
}
