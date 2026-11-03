export interface EffectCategory {
  effectCategoryId: number;
  /** CCP's internal name, e.g. `dgmEffPassive`. */
  name: string | null;
  /** Ours: a player-facing name and description, written by hand. */
  customName: string | null;
  customDescription: string | null;
}

/** Trimmed-empty text becomes null, so the page can fall back on CCP's name. */
const nonBlank = (value: string | null | undefined) =>
  value?.trim() ? value : null;

/**
 * A dogma effect's category as the effect page shows it, from the effect's
 * `effectCategoryId` and its `DogmaEffectCategory` row (absent when Hoboleaks
 * has not listed that id yet). Null for an effect with no category.
 */
export function toEffectCategory(
  effectCategoryId: number | null,
  row:
    | {
        name: string;
        customName: string | null;
        customDescription: string | null;
      }
    | null
    | undefined,
): EffectCategory | null {
  if (effectCategoryId === null) return null;
  return {
    effectCategoryId,
    name: row?.name ?? null,
    customName: nonBlank(row?.customName),
    customDescription: nonBlank(row?.customDescription),
  };
}

/** The eight categories, keyed by id: what pages send instead of a copy per effect. */
export type EffectCategories = Record<number, EffectCategory>;

/**
 * Our name for the category, else CCP's with the prefix dropped
 * (`dgmEffTarget` → `Target`), else its id.
 */
export function effectCategoryLabel(
  category: Pick<EffectCategory, "effectCategoryId" | "name" | "customName">,
): string {
  if (category.customName) return category.customName;
  if (!category.name) return `Category ${category.effectCategoryId}`;
  return category.name.replace(/^dgmEff/, "");
}

/** The label for a category id, for a table column; null when the effect has none. */
export function effectCategoryLabelById(
  categories: EffectCategories,
  effectCategoryId: number | null | undefined,
): string | null {
  if (effectCategoryId === null || effectCategoryId === undefined) return null;
  const category = categories[effectCategoryId];
  return category
    ? effectCategoryLabel(category)
    : `Category ${effectCategoryId}`;
}

export interface EffectCategoryGroup<T> {
  /** Null for the effects with no (known) category, listed last. */
  category: EffectCategory | null;
  items: T[];
}

/**
 * Items grouped by their effect's category, in category-id order (Passive
 * first), keeping each group's items in their given order. Items whose
 * category is unknown come last, in one group with a null category.
 */
export function groupByEffectCategory<T>(
  items: readonly T[],
  categoryIdOf: (item: T) => number | null | undefined,
  categories: EffectCategories,
): EffectCategoryGroup<T>[] {
  const groups = new Map<number | null, T[]>();
  for (const item of items) {
    const id = categoryIdOf(item) ?? null;
    const group = groups.get(id);
    if (group) group.push(item);
    else groups.set(id, [item]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (a === null) return 1;
      if (b === null) return -1;
      return a - b;
    })
    .map(([id, groupItems]) => ({
      category:
        id === null ? null : (categories[id] ?? toEffectCategory(id, null)),
      items: groupItems,
    }));
}
