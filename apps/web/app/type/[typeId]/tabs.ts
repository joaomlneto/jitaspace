/** Tab identifiers for the type detail page, in display order. */
export const TYPE_PAGE_TABS = [
  "overview",
  "combat",
  "attributes",
  "synchronizer",
  "variations",
  "market",
  "contracts",
  "insurance",
  "description",
  "type-lists",
  "history",
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

/**
 * The tab to show for the requested one. A tab only some items have (combat,
 * insurance, type lists, synchronizer) falls back to the default when this
 * item does not show it: `?tab=combat` on a ship would otherwise select a tab
 * that is not rendered, leaving the page blank.
 */
export function resolveTypePageTab(
  requested: TypePageTab,
  shown: Readonly<Partial<Record<TypePageTab, boolean>>>,
): TypePageTab {
  return shown[requested] === false ? DEFAULT_TYPE_PAGE_TAB : requested;
}
