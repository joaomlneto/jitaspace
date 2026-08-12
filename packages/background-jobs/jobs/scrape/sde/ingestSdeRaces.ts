import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeTable,
  loadSdeFileIds,
  loadSdeFiles,
  optionalNumber,
} from "../../../helpers";

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
    const files = await loadSdeFiles(["races.yaml"]);
    // `shipTypeID` is the race's starter ship. Guard it against types.yaml the
    // way ingestSdeTypes guards its own optional FKs.
    const typeIds = await loadSdeFileIds("types.yaml");

    // `factionId` is not set here — it is sourced from ESI, so the diff leaves
    // it untouched (races.yaml has no factionID anyway).
    const races = await ingestSdeTable({
      filename: "races.yaml",
      records: files["races.yaml"],
      idField: "raceId",
      delegate: prisma.race,
      toRow: (record, id): Prisma.RaceCreateManyInput => {
        const shipTypeId = optionalNumber(record.shipTypeID);
        return {
          raceId: id,
          name: enString(record.name) ?? "",
          description: enString(record.description),
          shipTypeId:
            shipTypeId != null && typeIds.has(shipTypeId) ? shipTypeId : null,
          isDeleted: false,
        };
      },
    });
    return { stats: { races }, elapsed: performance.now() - start };
  },
});
