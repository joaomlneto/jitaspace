import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { enString, ingestSdeTable } from "../../../helpers";

export interface IngestSdeArchetypesEventPayload {
  data: Record<string, never>;
}

export const ingestSdeArchetypes = defineJob<
  IngestSdeArchetypesEventPayload["data"]
>({
  id: "ingest-sde-archetypes",
  name: "Ingest SDE Archetypes",
  description:
    "Download the SDE and ingest archetypes.yaml into the Archetype table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const archetypes = await ingestSdeTable({
      filename: "archetypes.yaml",
      idField: "archetypeId",
      delegate: prisma.archetype,
      toRow: (record, id): Prisma.ArchetypeCreateManyInput => ({
        archetypeId: id,
        title: enString(record.title),
        description: enString(record.description) ?? "",
        isDeleted: false,
      }),
    });
    return { stats: { archetypes }, elapsed: performance.now() - start };
  },
});
