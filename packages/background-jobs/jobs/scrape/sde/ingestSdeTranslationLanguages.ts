import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  ingestSdeCompositeTable,
  loadSdeFiles,
  plainString,
} from "../../../helpers";

export interface IngestSdeTranslationLanguagesEventPayload {
  data: Record<string, never>;
}

/**
 * translationLanguages.yaml is keyed by a language code string, so it uses the
 * composite-table helper with a single string key field.
 */
export const ingestSdeTranslationLanguages = defineJob<
  IngestSdeTranslationLanguagesEventPayload["data"]
>({
  id: "ingest-sde-translation-languages",
  name: "Ingest SDE Translation Languages",
  description:
    "Download the SDE and ingest translationLanguages.yaml into the TranslationLanguage table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles(["translationLanguages.yaml"]);
    const data = files["translationLanguages.yaml"];

    const rows: Prisma.TranslationLanguageCreateManyInput[] = Object.entries(
      data,
    ).map(([languageId, record]) => ({
      languageId,
      name: plainString((record as Record<string, unknown>).name) ?? "",
      isDeleted: false,
    }));

    const translationLanguages = await ingestSdeCompositeTable({
      delegate: prisma.translationLanguage,
      rows,
      keyFields: ["languageId"],
      scopeField: "languageId",
      scopeIds: rows.map((row) => row.languageId),
    });
    return {
      stats: { translationLanguages },
      elapsed: performance.now() - start,
    };
  },
});
