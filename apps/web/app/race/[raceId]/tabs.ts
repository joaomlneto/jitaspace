/** Tab identifiers for the race detail page, in display order. */
export const RACE_PAGE_TABS = [
  "overview",
  "description",
  "bloodlines",
  "schools",
  "skills",
  "ships",
  "ship-tree",
  "items",
  "corporations",
  "stations",
  "history",
] as const;

export type RacePageTab = (typeof RACE_PAGE_TABS)[number];

/** Tab shown when no (valid) tab is requested. */
export const DEFAULT_RACE_PAGE_TAB: RacePageTab = "overview";

/** Type guard narrowing an arbitrary value to a known race page tab id. */
export function isRacePageTab(
  value: string | null | undefined,
): value is RacePageTab {
  return value != null && (RACE_PAGE_TABS as readonly string[]).includes(value);
}
