import { z } from "zod";

/**
 * Reader-side schemas + types for the resource-level change history (raw files
 * + localization strings). Read from the standalone history database via the
 * server functions in `~/lib/history-actions`.
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
