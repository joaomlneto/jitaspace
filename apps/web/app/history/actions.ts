"use server";

import { prisma } from "~/lib/db";

/**
 * Name lookups for the history UI's breadcrumb labels, served from our own
 * database instead of the SDE API.
 *
 * These can't be resolved once on the server and passed down as props the way
 * the type/system/character pages do: a breadcrumb walks a chain (Type → Group
 * → Category, market group → parents) whose next link is only known after the
 * current one resolves, and the ids themselves come from diff rows rendered
 * deep inside client state. So each label still fetches, and these server
 * actions are what it fetches from.
 *
 * Every lookup returns null rather than throwing for an unknown id: history is
 * generated from the game client and can reference entities newer than the
 * ingested SDE, and the labels already fall back to `#id` for those.
 */

/** A resolved label plus the parent that the next breadcrumb crumb needs. */
export interface HistoryLabel {
  name: string | null;
  parentId: number | null;
}

const nullLabel: HistoryLabel = { name: null, parentId: null };

/**
 * First value that has visible text, else null. Several SDE names are present
 * but blank, so a plain `??` chain would return the empty string.
 */
const firstNonEmpty = (
  ...values: (string | null | undefined)[]
): string | null =>
  values
    .map((value) => value?.trim())
    .find((value) => value !== undefined && value !== "") ?? null;

export async function resolveCategoryLabel(id: number): Promise<HistoryLabel> {
  try {
    const row = await prisma.category.findUnique({
      select: { name: true },
      where: { categoryId: id },
    });
    return row ? { name: row.name, parentId: null } : nullLabel;
  } catch {
    return nullLabel;
  }
}

export async function resolveGroupLabel(id: number): Promise<HistoryLabel> {
  try {
    const row = await prisma.group.findUnique({
      select: { name: true, categoryId: true },
      where: { groupId: id },
    });
    return row ? { name: row.name, parentId: row.categoryId } : nullLabel;
  } catch {
    return nullLabel;
  }
}

export async function resolveTypeLabel(id: number): Promise<HistoryLabel> {
  try {
    const row = await prisma.type.findUnique({
      select: { name: true, groupId: true },
      where: { typeId: id },
    });
    return row
      ? { name: firstNonEmpty(row.name), parentId: row.groupId }
      : nullLabel;
  } catch {
    return nullLabel;
  }
}

export async function resolveMarketGroupLabel(
  id: number,
): Promise<HistoryLabel> {
  try {
    const row = await prisma.marketGroup.findUnique({
      select: { name: true, parentMarketGroupId: true },
      where: { marketGroupId: id },
    });
    return row
      ? { name: row.name, parentId: row.parentMarketGroupId }
      : nullLabel;
  } catch {
    return nullLabel;
  }
}

export async function resolveRaceLabel(id: number): Promise<HistoryLabel> {
  try {
    const row = await prisma.race.findUnique({
      select: { name: true },
      where: { raceId: id },
    });
    return row ? { name: row.name, parentId: null } : nullLabel;
  } catch {
    return nullLabel;
  }
}

export async function resolveFactionLabel(id: number): Promise<HistoryLabel> {
  try {
    const row = await prisma.faction.findUnique({
      select: { name: true },
      where: { factionId: id },
    });
    return row ? { name: firstNonEmpty(row.name), parentId: null } : nullLabel;
  } catch {
    return nullLabel;
  }
}

/**
 * Dogma attributes carry more than a name: the unit that suffixes their values
 * and `highIsGood`, which decides whether an increase renders green or red.
 */
export interface DogmaAttributeLabel {
  name: string | null;
  unitId: number | null;
  highIsGood: boolean | null;
}

const nullAttribute: DogmaAttributeLabel = {
  name: null,
  unitId: null,
  highIsGood: null,
};

/** Dogma attributes prefer `displayName`, falling back to the internal name. */
export async function resolveDogmaAttributeLabel(
  id: number,
): Promise<DogmaAttributeLabel> {
  try {
    const row = await prisma.dogmaAttribute.findUnique({
      select: {
        displayName: true,
        name: true,
        unitId: true,
        highIsGood: true,
      },
      where: { attributeId: id },
    });
    if (!row) return nullAttribute;
    return {
      name: firstNonEmpty(row.displayName, row.name),
      unitId: row.unitId,
      highIsGood: row.highIsGood,
    };
  } catch {
    return nullAttribute;
  }
}

export async function resolveDogmaEffectLabel(
  id: number,
): Promise<HistoryLabel> {
  try {
    const row = await prisma.dogmaEffect.findUnique({
      select: { displayName: true, name: true },
      where: { effectId: id },
    });
    if (!row) return nullLabel;
    return {
      name: firstNonEmpty(row.displayName, row.name),
      parentId: null,
    };
  } catch {
    return nullLabel;
  }
}

/** The unit's symbol, used to suffix dogma attribute values. */
export async function resolveDogmaUnitLabel(id: number): Promise<HistoryLabel> {
  try {
    const row = await prisma.dogmaUnit.findUnique({
      select: { displayName: true, name: true },
      where: { unitId: id },
    });
    if (!row) return nullLabel;
    return {
      name: firstNonEmpty(row.displayName, row.name),
      parentId: null,
    };
  } catch {
    return nullLabel;
  }
}
