import type { NpcStats } from "~/lib/npcStats";
import { prisma } from "~/lib/db";
import {
  computeNpcStats,
  MISSILE_TYPE_ATTRIBUTE_ID,
  NPC_STAT_ATTRIBUTE_IDS,
  NPC_STAT_EFFECT_IDS,
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

/** The stat-relevant dogma attributes of each type, keyed by type id. */
async function readStatAttributes(typeIds: readonly number[]) {
  const byType = new Map<number, Map<number, number>>();
  if (typeIds.length === 0) return byType;
  const rows = await prisma.typeAttribute.findMany({
    select: { typeId: true, attributeId: true, value: true },
    where: {
      typeId: { in: [...typeIds] },
      attributeId: { in: [...NPC_STAT_ATTRIBUTE_IDS] },
      isDeleted: false,
    },
  });
  for (const row of rows) {
    let attributes = byType.get(row.typeId);
    if (!attributes) {
      attributes = new Map();
      byType.set(row.typeId, attributes);
    }
    attributes.set(row.attributeId, row.value);
  }
  return byType;
}

/** The stat-relevant dogma effects of each type, keyed by type id. */
async function readStatEffects(typeIds: readonly number[]) {
  const byType = new Map<number, Set<number>>();
  if (typeIds.length === 0) return byType;
  const rows = await prisma.typeEffect.findMany({
    select: { typeId: true, effectId: true },
    where: {
      typeId: { in: [...typeIds] },
      effectId: { in: [...NPC_STAT_EFFECT_IDS] },
      isDeleted: false,
    },
  });
  for (const row of rows) {
    let effects = byType.get(row.typeId);
    if (!effects) {
      effects = new Set();
      byType.set(row.typeId, effects);
    }
    effects.add(row.effectId);
  }
  return byType;
}

/**
 * Combat figures for NPC and drone types, from our SDE tables: their own dogma
 * attributes and effects, plus the attributes of the missiles they launch
 * (missile damage lives on the missile). Types with no stat attributes at all
 * are left out. Not cached itself, and throws on a database error: callers
 * wrap it in their own `"use cache"` scope and decide how to degrade.
 */
export async function readNpcStats(
  typeIds: readonly number[],
): Promise<Map<number, NpcStats>> {
  const [attributes, effects] = await Promise.all([
    readStatAttributes(typeIds),
    readStatEffects(typeIds),
  ]);
  const missileTypeIds = [
    ...new Set(
      [...attributes.values()].flatMap((attrs) => {
        const id = attrs.get(MISSILE_TYPE_ATTRIBUTE_ID);
        return id === undefined ? [] : [id];
      }),
    ),
  ];
  const missiles = await readStatAttributes(missileTypeIds);
  return new Map(
    [...attributes].map(([typeId, attrs]) => {
      const missileTypeId = attrs.get(MISSILE_TYPE_ATTRIBUTE_ID);
      return [
        typeId,
        computeNpcStats(
          attrs,
          missileTypeId === undefined ? undefined : missiles.get(missileTypeId),
          effects.get(typeId),
        ),
      ];
    }),
  );
}
