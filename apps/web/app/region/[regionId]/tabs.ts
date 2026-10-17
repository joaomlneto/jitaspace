/** Tab identifiers for the region detail page, in display order. */
export const REGION_PAGE_TABS = [
  "overview",
  "constellations",
  "systems",
  "incursions",
  "history",
] as const;

export type RegionPageTab = (typeof REGION_PAGE_TABS)[number];

/** Tab shown when no (valid) tab is requested. */
export const DEFAULT_REGION_PAGE_TAB: RegionPageTab = "overview";

/** Type guard narrowing an arbitrary value to a known region page tab. */
export function isRegionPageTab(
  value: string | null | undefined,
): value is RegionPageTab {
  return (
    value != null && (REGION_PAGE_TABS as readonly string[]).includes(value)
  );
}
