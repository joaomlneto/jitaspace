import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { ingestSdeTable, requiredNumber } from "../../../helpers";

export interface IngestSdeCompressibleTypesEventPayload {
  data: Record<string, never>;
}

export const ingestSdeCompressibleTypes = defineJob<
  IngestSdeCompressibleTypesEventPayload["data"]
>({
  id: "ingest-sde-compressible-types",
  name: "Ingest SDE Compressible Types",
  description:
    "Download the SDE and ingest compressibleTypes.yaml into the CompressibleType table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const compressibleTypes = await ingestSdeTable({
      filename: "compressibleTypes.yaml",
      idField: "typeId",
      delegate: prisma.compressibleType,
      toRow: (record, id): Prisma.CompressibleTypeCreateManyInput => ({
        typeId: id,
        compressedTypeId: requiredNumber(record.compressedTypeID),
        isDeleted: false,
      }),
    });
    return { stats: { compressibleTypes }, elapsed: performance.now() - start };
  },
});
