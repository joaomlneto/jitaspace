/** Tab identifiers for the alliance detail page, in display order. */
export const ALLIANCE_PAGE_TABS = [
  "overview",
  "corporations",
  "sovereignty",
  "wars",
  "killboard",
] as const;

export type AlliancePageTab = (typeof ALLIANCE_PAGE_TABS)[number];

/** Tab shown when no (valid) tab is requested. */
export const DEFAULT_ALLIANCE_PAGE_TAB: AlliancePageTab = "overview";

/** Type guard narrowing an arbitrary value to a known alliance page tab id. */
export function isAlliancePageTab(
  value: string | null | undefined,
): value is AlliancePageTab {
  return (
    value != null && (ALLIANCE_PAGE_TABS as readonly string[]).includes(value)
  );
}
