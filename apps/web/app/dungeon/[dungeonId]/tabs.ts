/** Tab identifiers for the dungeon detail page, in display order. */
export const DUNGEON_PAGE_TABS = [
  "overview",
  "description",
  "ship-restrictions",
  "missions",
  "agents",
  "operations",
  "related",
  "history",
] as const;

export type DungeonPageTab = (typeof DUNGEON_PAGE_TABS)[number];

/** Tab shown when no (valid) tab is requested. */
export const DEFAULT_DUNGEON_PAGE_TAB: DungeonPageTab = "overview";

/** Type guard narrowing an arbitrary value to a known dungeon page tab id. */
export function isDungeonPageTab(
  value: string | null | undefined,
): value is DungeonPageTab {
  return (
    value != null && (DUNGEON_PAGE_TABS as readonly string[]).includes(value)
  );
}
