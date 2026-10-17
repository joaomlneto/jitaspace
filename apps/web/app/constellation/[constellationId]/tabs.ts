/** Tab identifiers for the constellation detail page, in display order. */
export const CONSTELLATION_PAGE_TABS = [
  "overview",
  "systems",
  "incursions",
  "history",
] as const;

export type ConstellationPageTab = (typeof CONSTELLATION_PAGE_TABS)[number];

/** Tab shown when no (valid) tab is requested. */
export const DEFAULT_CONSTELLATION_PAGE_TAB: ConstellationPageTab = "overview";

/** Type guard narrowing an arbitrary value to a known constellation page tab. */
export function isConstellationPageTab(
  value: string | null | undefined,
): value is ConstellationPageTab {
  return (
    value != null &&
    (CONSTELLATION_PAGE_TABS as readonly string[]).includes(value)
  );
}
