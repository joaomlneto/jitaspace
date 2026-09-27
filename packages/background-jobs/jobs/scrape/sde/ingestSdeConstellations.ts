import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeTable,
  optionalNumber,
  requiredNumber,
  subRecord,
} from "../../../helpers";

export interface IngestSdeConstellationsEventPayload {
  data: Record<string, never>;
}

export const ingestSdeConstellations = defineJob<
  IngestSdeConstellationsEventPayload["data"]
>({
  id: "ingest-sde-constellations",
  name: "Ingest SDE Constellations",
  description:
    "Download the SDE and ingest mapConstellations.yaml into the Constellation table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const constellations = await ingestSdeTable({
      filename: "mapConstellations.yaml",
      idField: "constellationId",
      delegate: prisma.constellation,
      toRow: (record, id): Prisma.ConstellationCreateManyInput => {
        // Galactic coordinates of the constellation centre, flattened into
        // three columns the way ingestSdeSolarSystems flattens `position`.
        const position = subRecord(record.position);
        return {
          constellationId: id,
          name: enString(record.name) ?? "",
          regionId: requiredNumber(record.regionID),
          wormholeClassId: optionalNumber(record.wormholeClassID),
          positionX: optionalNumber(position.x),
          positionY: optionalNumber(position.y),
          positionZ: optionalNumber(position.z),
          // A plain id, not a relation — no FK to dangle against, and every one
          // of the 386 values resolves in factions.yaml today anyway.
          factionId: optionalNumber(record.factionID),
          isDeleted: false,
        };
      },
    });
    return { stats: { constellations }, elapsed: performance.now() - start };
  },
});
