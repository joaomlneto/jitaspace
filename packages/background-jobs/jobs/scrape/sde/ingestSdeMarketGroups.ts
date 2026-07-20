import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { enString, ingestSdeTable, optionalNumber } from "../../../helpers";

export interface IngestSdeMarketGroupsEventPayload {
  data: Record<string, never>;
}

export const ingestSdeMarketGroups = defineJob<
  IngestSdeMarketGroupsEventPayload["data"]
>({
  id: "ingest-sde-market-groups",
  name: "Ingest SDE Market Groups",
  description:
    "Download the SDE and ingest marketGroups.yaml into the MarketGroup table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const marketGroups = await ingestSdeTable({
      filename: "marketGroups.yaml",
      idField: "marketGroupId",
      delegate: prisma.marketGroup,
      toRow: (record, id): Prisma.MarketGroupCreateManyInput => ({
        marketGroupId: id,
        name: enString(record.name) ?? "",
        description: enString(record.description) ?? "",
        parentMarketGroupId: optionalNumber(record.parentGroupID),
        isDeleted: false,
      }),
    });
    return { stats: { marketGroups }, elapsed: performance.now() - start };
  },
});
