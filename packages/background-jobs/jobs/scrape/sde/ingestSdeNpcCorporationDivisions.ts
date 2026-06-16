import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { enString, ingestSdeTable, plainString } from "../../../helpers";

export interface IngestSdeNpcCorporationDivisionsEventPayload {
  data: Record<string, never>;
}

export const ingestSdeNpcCorporationDivisions = defineJob<
  IngestSdeNpcCorporationDivisionsEventPayload["data"]
>({
  id: "ingest-sde-npc-corporation-divisions",
  name: "Ingest SDE NPC Corporation Divisions",
  description:
    "Download the SDE and ingest npcCorporationDivisions.yaml into the NpcCorporationDivision table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const npcCorporationDivisions = await ingestSdeTable({
      filename: "npcCorporationDivisions.yaml",
      idField: "npcCorporationDivisionId",
      delegate: prisma.npcCorporationDivision,
      toRow: (record, id): Prisma.NpcCorporationDivisionCreateManyInput => ({
        npcCorporationDivisionId: id,
        name: enString(record.name) ?? plainString(record.displayName) ?? "",
        internalName: plainString(record.internalName) ?? "",
        leaderTypeName: enString(record.leaderTypeName),
        isDeleted: false,
      }),
    });
    return {
      stats: { npcCorporationDivisions },
      elapsed: performance.now() - start,
    };
  },
});
