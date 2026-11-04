/** Tab identifiers for the war page, in display order. */
export const WAR_PAGE_TABS = ["overview", "killmails", "allies"] as const;

export type WarPageTab = (typeof WAR_PAGE_TABS)[number];

/** Tab shown when no (valid) tab is requested. */
export const DEFAULT_WAR_PAGE_TAB: WarPageTab = "overview";

/** Type guard narrowing an arbitrary value to a known war page tab. */
export function isWarPageTab(
  value: string | null | undefined,
): value is WarPageTab {
  return value != null && (WAR_PAGE_TABS as readonly string[]).includes(value);
}
