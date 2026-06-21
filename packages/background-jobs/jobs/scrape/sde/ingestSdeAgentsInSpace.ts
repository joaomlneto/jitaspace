import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { ingestSdeTable, requiredNumber } from "../../../helpers";

export interface IngestSdeAgentsInSpaceEventPayload {
  data: Record<string, never>;
}

export const ingestSdeAgentsInSpace = defineJob<
  IngestSdeAgentsInSpaceEventPayload["data"]
>({
  id: "ingest-sde-agents-in-space",
  name: "Ingest SDE Agents in Space",
  description:
    "Download the SDE and ingest agentsInSpace.yaml into the AgentInSpace table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    // Each row references an Agent (characterId), a SolarSystem and a Type, which
    // are assumed to already exist.
    const agentsInSpace = await ingestSdeTable({
      filename: "agentsInSpace.yaml",
      idField: "characterId",
      delegate: prisma.agentInSpace,
      toRow: (record, id): Prisma.AgentInSpaceCreateManyInput => ({
        characterId: id,
        dungeonId: requiredNumber(record.dungeonID),
        solarSystemId: requiredNumber(record.solarSystemID),
        spawnPointId: requiredNumber(record.spawnPointID),
        typeId: requiredNumber(record.typeID),
        isDeleted: false,
      }),
    });
    return { stats: { agentsInSpace }, elapsed: performance.now() - start };
  },
});
