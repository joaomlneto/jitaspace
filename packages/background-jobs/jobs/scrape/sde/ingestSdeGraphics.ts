import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  ingestSdeCompositeTable,
  ingestSdeTable,
  loadSdeFileIds,
  loadSdeFiles,
  optionalNumber,
  plainString,
} from "../../../helpers";

export interface IngestSdeGraphicsEventPayload {
  data: Record<string, never>;
}

interface GraphicRecord {
  sofLayout?: string[];
}

export const ingestSdeGraphics = defineJob<
  IngestSdeGraphicsEventPayload["data"]
>({
  id: "ingest-sde-graphics",
  name: "Ingest SDE Graphics",
  description:
    "Download the SDE and ingest graphics.yaml into the Graphic and GraphicSofLayout tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles(["graphics.yaml"]);
    const data = files["graphics.yaml"];
    // `sofMaterialSetID` is a real FK now, so drop any id that isn't there —
    // the same guard ingestSdeTypes applies to its optional refs.
    const materialSetIds = await loadSdeFileIds("graphicMaterialSets.yaml");
    const present = (ids: ReadonlySet<number>, value: number | null) =>
      value != null && ids.has(value) ? value : null;

    const graphics = await ingestSdeTable({
      filename: "graphics.yaml",
      records: data,
      idField: "graphicId",
      delegate: prisma.graphic,
      toRow: (record, id): Prisma.GraphicCreateManyInput => ({
        graphicId: id,
        graphicFile: plainString(record.graphicFile),
        iconFolder: plainString(record.iconFolder),
        sofFactionName: plainString(record.sofFactionName),
        sofHullName: plainString(record.sofHullName),
        sofRaceName: plainString(record.sofRaceName),
        sofMaterialSetId: present(
          materialSetIds,
          optionalNumber(record.sofMaterialSetID),
        ),
        isDeleted: false,
      }),
    });

    // `sofLayout` is a list, so it gets its own rows rather than a column.
    const sofLayouts: Prisma.GraphicSofLayoutCreateManyInput[] = [];
    for (const [key, value] of Object.entries(data)) {
      const graphicId = Number(key);
      const record = value as GraphicRecord;
      for (const layout of record.sofLayout ?? []) {
        sofLayouts.push({ graphicId, layout, isDeleted: false });
      }
    }

    const graphicSofLayouts = await ingestSdeCompositeTable({
      delegate: prisma.graphicSofLayout,
      rows: sofLayouts,
      keyFields: ["graphicId", "layout"],
      scopeField: "graphicId",
      scopeIds: Object.keys(data).map(Number),
    });

    return {
      stats: { graphics, graphicSofLayouts },
      elapsed: performance.now() - start,
    };
  },
});
