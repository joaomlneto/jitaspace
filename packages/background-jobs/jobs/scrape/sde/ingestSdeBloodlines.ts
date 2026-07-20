import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { enString, ingestSdeTable, requiredNumber } from "../../../helpers";

export interface IngestSdeBloodlinesEventPayload {
  data: Record<string, never>;
}

export const ingestSdeBloodlines = defineJob<
  IngestSdeBloodlinesEventPayload["data"]
>({
  id: "ingest-sde-bloodlines",
  name: "Ingest SDE Bloodlines",
  description:
    "Download the SDE and ingest bloodlines.yaml into the Bloodline table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const bloodlines = await ingestSdeTable({
      filename: "bloodlines.yaml",
      idField: "bloodlineId",
      delegate: prisma.bloodline,
      toRow: (record, id): Prisma.BloodlineCreateManyInput => ({
        bloodlineId: id,
        corporationId: requiredNumber(record.corporationID),
        raceId: requiredNumber(record.raceID),
        name: enString(record.name) ?? "",
        description: enString(record.description) ?? "",
        charisma: requiredNumber(record.charisma),
        intelligence: requiredNumber(record.intelligence),
        memory: requiredNumber(record.memory),
        perception: requiredNumber(record.perception),
        willpower: requiredNumber(record.willpower),
        isDeleted: false,
      }),
    });
    return { stats: { bloodlines }, elapsed: performance.now() - start };
  },
});
