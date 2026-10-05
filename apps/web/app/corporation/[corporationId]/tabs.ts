/** Tab identifiers for the corporation detail page, in display order. */
export const CORPORATION_PAGE_TABS = [
  "overview",
  "description",
  "history",
  "stations",
  "agents",
  "economy",
  "wars",
  "killboard",
] as const;

export type CorporationPageTab = (typeof CORPORATION_PAGE_TABS)[number];

/** Tab shown when no (valid) tab is requested. */
export const DEFAULT_CORPORATION_PAGE_TAB: CorporationPageTab = "overview";

/** The tabs whose rows the page does not carry; opening one fetches them. */
export const CORPORATION_TABLE_TABS = new Set<CorporationPageTab>([
  "stations",
  "agents",
  "economy",
  "wars",
]);

/** Type guard narrowing an arbitrary value to a known corporation page tab. */
export function isCorporationPageTab(
  value: string | null | undefined,
): value is CorporationPageTab {
  return (
    value != null &&
    (CORPORATION_PAGE_TABS as readonly string[]).includes(value)
  );
}
