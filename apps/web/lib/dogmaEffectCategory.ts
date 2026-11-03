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
