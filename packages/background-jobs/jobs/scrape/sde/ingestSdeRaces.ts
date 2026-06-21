import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { enString, ingestSdeTable } from "../../../helpers";

export interface IngestSdeRacesEventPayload {
  data: Record<string, never>;
}

export const ingestSdeRaces = defineJob<IngestSdeRacesEventPayload["data"]>({
  id: "ingest-sde-races",
  name: "Ingest SDE Races",
  description: "Download the SDE and ingest races.yaml into the Race table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    // `factionId` is not set here — it is sourced from ESI, so the diff leaves
    // it untouched (races.yaml has no factionID anyway).
    const races = await ingestSdeTable({
      filename: "races.yaml",
      idField: "raceId",
      delegate: prisma.race,
      toRow: (record, id): Prisma.RaceCreateManyInput => ({
        raceId: id,
        name: enString(record.name) ?? "",
        description: enString(record.description),
        isDeleted: false,
      }),
    });
    return { stats: { races }, elapsed: performance.now() - start };
  },
});
