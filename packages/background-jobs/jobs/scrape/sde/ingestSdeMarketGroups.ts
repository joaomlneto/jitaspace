import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeTable,
  loadSdeFileIds,
  loadSdeFiles,
  optionalBoolean,
  optionalNumber,
} from "../../../helpers";

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
    const files = await loadSdeFiles(["marketGroups.yaml"]);
    // Like types.yaml, market group iconIDs can point at icons that aren't in
    // icons.yaml — drop those rather than violating the foreign key.
    const iconIds = await loadSdeFileIds("icons.yaml");

    const marketGroups = await ingestSdeTable({
      filename: "marketGroups.yaml",
      records: files["marketGroups.yaml"],
      idField: "marketGroupId",
      delegate: prisma.marketGroup,
      toRow: (record, id): Prisma.MarketGroupCreateManyInput => {
        const iconId = optionalNumber(record.iconID);
        return {
          marketGroupId: id,
          name: enString(record.name) ?? "",
          description: enString(record.description) ?? "",
          parentMarketGroupId: optionalNumber(record.parentGroupID),
          iconId: iconId != null && iconIds.has(iconId) ? iconId : null,
          hasTypes: optionalBoolean(record.hasTypes),
          isDeleted: false,
        };
      },
    });
    return { stats: { marketGroups }, elapsed: performance.now() - start };
  },
});
