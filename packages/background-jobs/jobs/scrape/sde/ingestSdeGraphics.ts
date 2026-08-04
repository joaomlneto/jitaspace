import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { ingestSdeTable, optionalNumber, plainString } from "../../../helpers";

export interface IngestSdeGraphicsEventPayload {
  data: Record<string, never>;
}

export const ingestSdeGraphics = defineJob<
  IngestSdeGraphicsEventPayload["data"]
>({
  id: "ingest-sde-graphics",
  name: "Ingest SDE Graphics",
  description:
    "Download the SDE and ingest graphics.yaml into the Graphic table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const graphics = await ingestSdeTable({
      filename: "graphics.yaml",
      idField: "graphicId",
      delegate: prisma.graphic,
      toRow: (record, id): Prisma.GraphicCreateManyInput => ({
        graphicId: id,
        graphicFile: plainString(record.graphicFile),
        iconFolder: plainString(record.iconFolder),
        sofFactionName: plainString(record.sofFactionName),
        sofHullName: plainString(record.sofHullName),
        sofRaceName: plainString(record.sofRaceName),
        // graphicMaterialSets.yaml has no table, so this stays a plain id.
        sofMaterialSetId: optionalNumber(record.sofMaterialSetID),
        isDeleted: false,
      }),
    });
    return { stats: { graphics }, elapsed: performance.now() - start };
  },
});
