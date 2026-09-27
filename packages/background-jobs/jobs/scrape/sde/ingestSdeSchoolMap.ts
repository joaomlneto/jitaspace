import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { ingestSdeTable, requiredNumber } from "../../../helpers";

export interface IngestSdeSchoolMapEventPayload {
  data: Record<string, never>;
}

/**
 * schoolMap.yaml — where each school's new capsuleers start. Keyed by the file's
 * own index rather than by school, so it is its own table rather than columns on
 * `School`.
 */
export const ingestSdeSchoolMap = defineJob<
  IngestSdeSchoolMapEventPayload["data"]
>({
  id: "ingest-sde-school-map",
  name: "Ingest SDE School Map",
  description:
    "Download the SDE and ingest schoolMap.yaml into the SchoolMap table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const schoolMaps = await ingestSdeTable({
      filename: "schoolMap.yaml",
      idField: "schoolMapId",
      delegate: prisma.schoolMap,
      toRow: (record, id): Prisma.SchoolMapCreateManyInput => ({
        schoolMapId: id,
        schoolId: requiredNumber(record.schoolID),
        solarSystemId: requiredNumber(record.solarSystemID),
        isDeleted: false,
      }),
    });
    return { stats: { schoolMaps }, elapsed: performance.now() - start };
  },
});
