import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeTable,
  loadSdeFileIds,
  loadSdeFiles,
  optionalNumber,
  subRecord,
} from "../../../helpers";

export interface IngestSdeRegionsEventPayload {
  data: Record<string, never>;
}

export const ingestSdeRegions = defineJob<IngestSdeRegionsEventPayload["data"]>(
  {
    id: "ingest-sde-regions",
    name: "Ingest SDE Regions",
    description:
      "Download the SDE and ingest mapRegions.yaml into the Region table.",
    trigger: { type: "event" },
    singleton: true,
    maxDurationSeconds: 1800,
    handler: async () => {
      const start = performance.now();
      const files = await loadSdeFiles(["mapRegions.yaml"]);
      // `nebulaID` is a graphics.yaml id (the universe nebula scene). Every id
      // resolves today, but guard it the way ingestSdeTypes guards graphicID so
      // a future dangling reference can't break the FK.
      const graphicIds = await loadSdeFileIds("graphics.yaml");

      const regions = await ingestSdeTable({
        filename: "mapRegions.yaml",
        records: files["mapRegions.yaml"],
        idField: "regionId",
        delegate: prisma.region,
        toRow: (record, id): Prisma.RegionCreateManyInput => {
          const nebulaGraphicId = optionalNumber(record.nebulaID);
          // Galactic coordinates of the region centre, flattened into three
          // columns the way ingestSdeSolarSystems flattens `position`.
          const position = subRecord(record.position);
          return {
            regionId: id,
            name: enString(record.name) ?? "",
            description: enString(record.description),
            nebulaGraphicId:
              nebulaGraphicId != null && graphicIds.has(nebulaGraphicId)
                ? nebulaGraphicId
                : null,
            wormholeClassId: optionalNumber(record.wormholeClassID),
            positionX: optionalNumber(position.x),
            positionY: optionalNumber(position.y),
            positionZ: optionalNumber(position.z),
            // A plain id, not a relation — no FK to dangle against, and every
            // one of the 33 values resolves in factions.yaml today anyway.
            factionId: optionalNumber(record.factionID),
            isDeleted: false,
          };
        },
      });
      return { stats: { regions }, elapsed: performance.now() - start };
    },
  },
);
