/** Tab identifiers for the status page, in display order. */
export const STATUS_PAGE_TABS = ["esi", "database", "background-jobs"] as const;

export type StatusPageTab = (typeof STATUS_PAGE_TABS)[number];

/** Tab shown when no (valid) tab is requested. */
export const DEFAULT_STATUS_PAGE_TAB: StatusPageTab = "esi";

/** Type guard narrowing an arbitrary value to a known status page tab id. */
export function isStatusPageTab(
  value: string | null | undefined,
): value is StatusPageTab {
  return (
    value != null && (STATUS_PAGE_TABS as readonly string[]).includes(value)
  );
}
