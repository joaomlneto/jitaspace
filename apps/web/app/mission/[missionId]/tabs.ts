/** Tab identifiers for the mission detail page, in display order. */
export const MISSION_PAGE_TABS = [
  "overview",
  "briefing",
  "dialogue",
  "epic-arc",
  "variants",
  "history",
] as const;

export type MissionPageTab = (typeof MISSION_PAGE_TABS)[number];

/** Tab shown when no (valid) tab is requested. */
export const DEFAULT_MISSION_PAGE_TAB: MissionPageTab = "overview";

/** Type guard narrowing an arbitrary value to a known mission page tab id. */
export function isMissionPageTab(
  value: string | null | undefined,
): value is MissionPageTab {
  return (
    value != null && (MISSION_PAGE_TABS as readonly string[]).includes(value)
  );
}
