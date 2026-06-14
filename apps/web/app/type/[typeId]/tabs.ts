/** Tab identifiers for the type detail page, in display order. */
export const TYPE_PAGE_TABS = [
  "overview",
  "attributes",
  "market",
  "description",
] as const;

export type TypePageTab = (typeof TYPE_PAGE_TABS)[number];

/** Tab shown when no (valid) tab is requested. */
export const DEFAULT_TYPE_PAGE_TAB: TypePageTab = "overview";

/** Type guard narrowing an arbitrary value to a known type page tab id. */
export function isTypePageTab(
  value: string | null | undefined,
): value is TypePageTab {
  return value != null && (TYPE_PAGE_TABS as readonly string[]).includes(value);
}
