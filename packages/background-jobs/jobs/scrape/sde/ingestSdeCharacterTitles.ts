import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeCompositeTable,
  loadSdeFiles,
} from "../../../helpers";

export interface IngestSdeCharacterTitlesEventPayload {
  data: Record<string, never>;
}

/**
 * characterTitles.yaml is keyed by a UUID string (not a numeric id), so it uses
 * the composite-table helper with a single string key field rather than
 * `ingestSdeTable` (which assumes a numeric id).
 */
export const ingestSdeCharacterTitles = defineJob<
  IngestSdeCharacterTitlesEventPayload["data"]
>({
  id: "ingest-sde-character-titles",
  name: "Ingest SDE Character Titles",
  description:
    "Download the SDE and ingest characterTitles.yaml into the CharacterTitle table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles(["characterTitles.yaml"]);
    const data = files["characterTitles.yaml"];

    const rows: Prisma.CharacterTitleCreateManyInput[] = Object.entries(
      data,
    ).map(([id, record]) => ({
      id,
      name: enString((record as Record<string, unknown>).name) ?? "",
      isDeleted: false,
    }));

    const characterTitles = await ingestSdeCompositeTable({
      delegate: prisma.characterTitle,
      rows,
      keyFields: ["id"],
      scopeField: "id",
      scopeIds: rows.map((row) => row.id),
    });
    return { stats: { characterTitles }, elapsed: performance.now() - start };
  },
});
