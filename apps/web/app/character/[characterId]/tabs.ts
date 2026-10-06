/** Tab identifiers for the character detail page, in display order. */
export const CHARACTER_PAGE_TABS = [
  "overview",
  "biography",
  "history",
  "agent",
  "killboard",
] as const;

export type CharacterPageTab = (typeof CHARACTER_PAGE_TABS)[number];

/** Tab shown when no (valid) tab is requested. */
export const DEFAULT_CHARACTER_PAGE_TAB: CharacterPageTab = "overview";

/** Type guard narrowing an arbitrary value to a known character page tab. */
export function isCharacterPageTab(
  value: string | null | undefined,
): value is CharacterPageTab {
  return (
    value != null && (CHARACTER_PAGE_TABS as readonly string[]).includes(value)
  );
}
