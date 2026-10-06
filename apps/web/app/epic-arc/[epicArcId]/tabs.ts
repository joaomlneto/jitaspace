/** Tab identifiers for the epic arc detail page, in display order. */
export const EPIC_ARC_PAGE_TABS = [
  "overview",
  "missions",
  "agents",
  "history",
] as const;

export type EpicArcPageTab = (typeof EPIC_ARC_PAGE_TABS)[number];

/** Tab shown when no (valid) tab is requested. */
export const DEFAULT_EPIC_ARC_PAGE_TAB: EpicArcPageTab = "overview";

/** Type guard narrowing an arbitrary value to a known epic arc page tab id. */
export function isEpicArcPageTab(
  value: string | null | undefined,
): value is EpicArcPageTab {
  return (
    value != null && (EPIC_ARC_PAGE_TABS as readonly string[]).includes(value)
  );
}
