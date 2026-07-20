import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeTable,
  optionalBoolean,
  optionalNumber,
  plainString,
} from "../../../helpers";

export interface IngestSdeDogmaAttributesEventPayload {
  data: Record<string, never>;
}

export const ingestSdeDogmaAttributes = defineJob<
  IngestSdeDogmaAttributesEventPayload["data"]
>({
  id: "ingest-sde-dogma-attributes",
  name: "Ingest SDE Dogma Attributes",
  description:
    "Download the SDE and ingest dogmaAttributes.yaml into the DogmaAttribute table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    // dogmaAttributes.yaml is a `noTransform` file: the id is the map key, not a
    // field on the record. `name`/`description` are plain strings (not localized).
    const dogmaAttributes = await ingestSdeTable({
      filename: "dogmaAttributes.yaml",
      idField: "attributeId",
      delegate: prisma.dogmaAttribute,
      toRow: (record, id): Prisma.DogmaAttributeCreateManyInput => ({
        attributeId: id,
        name: plainString(record.name),
        description: plainString(record.description),
        displayName: enString(record.displayName),
        defaultValue: optionalNumber(record.defaultValue),
        highIsGood: optionalBoolean(record.highIsGood),
        stackable: optionalBoolean(record.stackable),
        published: optionalBoolean(record.published),
        unitId: optionalNumber(record.unitID),
        iconId: optionalNumber(record.iconID),
        isDeleted: false,
      }),
    });
    return { stats: { dogmaAttributes }, elapsed: performance.now() - start };
  },
});
