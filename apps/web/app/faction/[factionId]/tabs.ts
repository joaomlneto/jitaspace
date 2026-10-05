/** Tab identifiers for the faction detail page, in display order. */
export const FACTION_PAGE_TABS = [
  "overview",
  "description",
  "territory",
  "corporations",
  "warfare",
  "items",
  "ship-tree",
  "contraband",
  "missions",
  "standings",
  "history",
] as const;

export type FactionPageTab = (typeof FACTION_PAGE_TABS)[number];

/** Tab shown when no (valid) tab is requested. */
export const DEFAULT_FACTION_PAGE_TAB: FactionPageTab = "overview";

/** Type guard narrowing an arbitrary value to a known faction page tab id. */
export function isFactionPageTab(
  value: string | null | undefined,
): value is FactionPageTab {
  return (
    value != null && (FACTION_PAGE_TABS as readonly string[]).includes(value)
  );
}
