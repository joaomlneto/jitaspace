import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { enString, ingestSdeTable, requiredNumber } from "../../../helpers";

export interface IngestSdeMercenaryTacticalOperationsEventPayload {
  data: Record<string, never>;
}

export const ingestSdeMercenaryTacticalOperations = defineJob<
  IngestSdeMercenaryTacticalOperationsEventPayload["data"]
>({
  id: "ingest-sde-mercenary-tactical-operations",
  name: "Ingest SDE Mercenary Tactical Operations",
  description:
    "Download the SDE and ingest mercenaryTacticalOperations.yaml into the MercenaryTacticalOperation table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const mercenaryTacticalOperations = await ingestSdeTable({
      filename: "mercenaryTacticalOperations.yaml",
      idField: "mercenaryTacticalOperationId",
      delegate: prisma.mercenaryTacticalOperation,
      toRow: (
        record,
        id,
      ): Prisma.MercenaryTacticalOperationCreateManyInput => ({
        mercenaryTacticalOperationId: id,
        name: enString(record.name) ?? "",
        description: enString(record.description) ?? "",
        dungeonId: requiredNumber(record.dungeonID),
        anarchyImpact: requiredNumber(record.anarchyImpact),
        developmentImpact: requiredNumber(record.developmentImpact),
        infomorphBonus: requiredNumber(record.infomorphBonus),
        isDeleted: false,
      }),
    });
    return {
      stats: { mercenaryTacticalOperations },
      elapsed: performance.now() - start,
    };
  },
});
