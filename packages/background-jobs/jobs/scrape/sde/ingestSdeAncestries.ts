import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeTable,
  optionalNumber,
  plainString,
  requiredNumber,
} from "../../../helpers";

export interface IngestSdeAncestriesEventPayload {
  data: Record<string, never>;
}

export const ingestSdeAncestries = defineJob<
  IngestSdeAncestriesEventPayload["data"]
>({
  id: "ingest-sde-ancestries",
  name: "Ingest SDE Ancestries",
  description:
    "Download the SDE and ingest ancestries.yaml into the Ancestry table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const ancestries = await ingestSdeTable({
      filename: "ancestries.yaml",
      idField: "ancestryId",
      delegate: prisma.ancestry,
      toRow: (record, id): Prisma.AncestryCreateManyInput => ({
        ancestryId: id,
        name: enString(record.name) ?? "",
        description: enString(record.description) ?? "",
        shortDescription: plainString(record.shortDescription),
        bloodlineId: requiredNumber(record.bloodlineID),
        iconId: optionalNumber(record.iconID),
        // Character-creation attribute bonuses. On all 43 records today, but the
        // columns are nullable, so read them optionally rather than as NaN.
        charisma: optionalNumber(record.charisma),
        intelligence: optionalNumber(record.intelligence),
        memory: optionalNumber(record.memory),
        perception: optionalNumber(record.perception),
        willpower: optionalNumber(record.willpower),
        isDeleted: false,
      }),
    });
    return { stats: { ancestries }, elapsed: performance.now() - start };
  },
});
