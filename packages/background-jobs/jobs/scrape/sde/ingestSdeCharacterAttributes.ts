import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeTable,
  optionalNumber,
  plainString,
} from "../../../helpers";

export interface IngestSdeCharacterAttributesEventPayload {
  data: Record<string, never>;
}

export const ingestSdeCharacterAttributes = defineJob<
  IngestSdeCharacterAttributesEventPayload["data"]
>({
  id: "ingest-sde-character-attributes",
  name: "Ingest SDE Character Attributes",
  description:
    "Download the SDE and ingest characterAttributes.yaml into the CharacterAttribute table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const characterAttributes = await ingestSdeTable({
      filename: "characterAttributes.yaml",
      idField: "attributeId",
      delegate: prisma.characterAttribute,
      toRow: (record, id): Prisma.CharacterAttributeCreateManyInput => ({
        attributeId: id,
        name: enString(record.name) ?? "",
        description: plainString(record.description) ?? "",
        shortDescription: plainString(record.shortDescription) ?? "",
        notes: plainString(record.notes) ?? "",
        iconId: optionalNumber(record.iconID),
        isDeleted: false,
      }),
    });
    return {
      stats: { characterAttributes },
      elapsed: performance.now() - start,
    };
  },
});
