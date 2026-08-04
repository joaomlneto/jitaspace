import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeTable,
  loadSdeFiles,
  optionalNumber,
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
      const files = await loadSdeFiles(["mapRegions.yaml", "graphics.yaml"]);
      // `nebulaID` is a graphics.yaml id (the universe nebula scene). Every id
      // resolves today, but guard it the way ingestSdeTypes guards graphicID so
      // a future dangling reference can't break the FK.
      const graphicIds = new Set(
        Object.keys(files["graphics.yaml"]).map(Number),
      );

      const regions = await ingestSdeTable({
        filename: "mapRegions.yaml",
        records: files["mapRegions.yaml"],
        idField: "regionId",
        delegate: prisma.region,
        toRow: (record, id): Prisma.RegionCreateManyInput => {
          const nebulaGraphicId = optionalNumber(record.nebulaID);
          return {
            regionId: id,
            name: enString(record.name) ?? "",
            description: enString(record.description),
            nebulaGraphicId:
              nebulaGraphicId != null && graphicIds.has(nebulaGraphicId)
                ? nebulaGraphicId
                : null,
            wormholeClassId: optionalNumber(record.wormholeClassID),
            isDeleted: false,
          };
        },
      });
      return { stats: { regions }, elapsed: performance.now() - start };
    },
  },
);
