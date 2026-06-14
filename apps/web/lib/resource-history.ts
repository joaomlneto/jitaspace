import { z } from "zod";

/**
 * Reader-side schema for the resource-level change history (raw files +
 * localization strings), produced by the CLI `build-resource-history` command
 * and served as static JSON under `public/history/resources/`.
 */

const Counts = z.object({
  added: z.number(),
  changed: z.number(),
  removed: z.number(),
});
export type Counts = z.infer<typeof Counts>;

export const ResourceIndex = z.object({
  generatedAt: z.string(),
  languages: z.array(z.string()),
  builds: z.array(
    z.object({
      build: z.number(),
      date: z.string().nullable(),
      files: Counts,
      strings: z.record(z.string(), Counts),
    }),
  ),
});
export type ResourceIndex = z.infer<typeof ResourceIndex>;

export const FileDiff = z.object({
  added: z.array(z.string()),
  changed: z.array(z.string()),
  removed: z.array(z.string()),
});
export type FileDiff = z.infer<typeof FileDiff>;

export const StringChange = z.object({
  id: z.number(),
  kind: z.enum(["added", "changed", "removed"]),
  from: z.string().optional(),
  to: z.string().optional(),
});
export const StringChanges = z.array(StringChange);
export type StringChange = z.infer<typeof StringChange>;

/** Human label for a localization language code. */
export const LANGUAGE_LABEL: Record<string, string> = {
  "en-us": "English",
  de: "German",
  es: "Spanish",
  fr: "French",
  it: "Italian",
  ja: "Japanese",
  ko: "Korean",
  ru: "Russian",
  zh: "Chinese",
};

// ── client-side fetchers (static JSON under /history/resources) ──────────────

async function fetchJson<T>(
  url: string,
  schema: z.ZodType<T>,
): Promise<T | null> {
  const res = await fetch(url);
  if (!res.ok) return null;
  return schema.parse(await res.json());
}

export const fetchResourceIndex = () =>
  fetchJson("/api/history-db/resources/index", ResourceIndex);

export const fetchFileDiff = (build: number) =>
  fetchJson(`/api/history-db/resources/files/${build}`, FileDiff);

export const fetchStringChanges = (build: number, lang: string) =>
  fetchJson(`/api/history-db/resources/strings/${build}/${lang}`, StringChanges);
