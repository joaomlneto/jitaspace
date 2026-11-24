import type { SdeLocalized } from "./types";

export type SdeLanguage = keyof SdeLocalized;

const SDE_LANGUAGES = new Set<string>([
  "de",
  "en",
  "es",
  "fr",
  "ja",
  "ko",
  "ru",
  "zh",
]);

/**
 * The SDE language for an ESI `Accept-Language` value ("en", "de", "fr-FR",
 * …), falling back to English for anything the SDE does not carry.
 */
export function sdeLanguage(acceptLanguage?: string): SdeLanguage {
  const code = acceptLanguage?.toLowerCase().split(/[-_]/)[0];
  return code !== undefined && SDE_LANGUAGES.has(code)
    ? (code as SdeLanguage)
    : "en";
}

const isLocalized = (value: unknown): value is SdeLocalized =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  typeof (value as { en?: unknown }).en === "string";

/** A localized string in `language`, or in English where it has none. */
export const localizeText = (text: SdeLocalized, language: SdeLanguage) =>
  text[language] ?? text.en;

/** An SDE record with each of its localized fields resolved to one string. */
export type Localized<T> = {
  [K in keyof T]: T[K] extends SdeLocalized
    ? string
    : T[K] extends SdeLocalized | undefined
      ? string | undefined
      : T[K];
};

/**
 * Resolve a record's top-level localized fields to `language`.
 *
 * Records are cached once with every language in them, so a language switch
 * re-reads the cache instead of refetching — unlike ESI, which answered in one
 * language per request.
 */
export function localizeRecord<T extends object>(
  record: T,
  language: SdeLanguage,
): Localized<T> {
  const localized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    localized[key] = isLocalized(value) ? localizeText(value, language) : value;
  }
  return localized as Localized<T>;
}
