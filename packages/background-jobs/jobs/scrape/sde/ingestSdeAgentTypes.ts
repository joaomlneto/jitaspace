import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { ingestSdeTable, plainString } from "../../../helpers";

export interface IngestSdeAgentTypesEventPayload {
  data: Record<string, never>;
}

export const ingestSdeAgentTypes = defineJob<
  IngestSdeAgentTypesEventPayload["data"]
>({
  id: "ingest-sde-agent-types",
  name: "Ingest SDE Agent Types",
  description:
    "Download the SDE and ingest agentTypes.yaml into the AgentType table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const agentTypes = await ingestSdeTable({
      filename: "agentTypes.yaml",
      idField: "agentTypeId",
      delegate: prisma.agentType,
      toRow: (record, id): Prisma.AgentTypeCreateManyInput => ({
        agentTypeId: id,
        name: plainString(record.name) ?? "",
        isDeleted: false,
      }),
    });
    return { stats: { agentTypes }, elapsed: performance.now() - start };
  },
});
