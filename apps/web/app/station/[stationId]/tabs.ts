/** Tab identifiers for the station detail page, in display order. */
export const STATION_PAGE_TABS = [
  "overview",
  "services",
  "agents",
  "history",
] as const;

export type StationPageTab = (typeof STATION_PAGE_TABS)[number];

/** Tab shown when no (valid) tab is requested. */
export const DEFAULT_STATION_PAGE_TAB: StationPageTab = "overview";

/** Type guard narrowing an arbitrary value to a known station page tab. */
export function isStationPageTab(
  value: string | null | undefined,
): value is StationPageTab {
  return (
    value != null && (STATION_PAGE_TABS as readonly string[]).includes(value)
  );
}
