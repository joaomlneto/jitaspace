import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { ingestSdeTable } from "../../../helpers";
import { toGraphicMaterialSetRow } from "./graphicMaterialSetTransforms";

export interface IngestSdeGraphicMaterialSetsEventPayload {
  data: Record<string, never>;
}

/**
 * graphicMaterialSets.yaml — the Space-Object-Factory material sets that
 * `Graphic.sofMaterialSetId` and `SkinMaterial.materialSetId` reference. Runs
 * before ingest-sde-graphics, which foreign-keys it.
 *
 * The row transform lives in ./graphicMaterialSetTransforms so it can be
 * unit-tested without mocking p-limit and the env.
 */
export const ingestSdeGraphicMaterialSets = defineJob<
  IngestSdeGraphicMaterialSetsEventPayload["data"]
>({
  id: "ingest-sde-graphic-material-sets",
  name: "Ingest SDE Graphic Material Sets",
  description:
    "Download the SDE and ingest graphicMaterialSets.yaml into the GraphicMaterialSet table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const graphicMaterialSets = await ingestSdeTable({
      filename: "graphicMaterialSets.yaml",
      idField: "materialSetId",
      delegate: prisma.graphicMaterialSet,
      toRow: (record, id): Prisma.GraphicMaterialSetCreateManyInput =>
        toGraphicMaterialSetRow(id, record),
    });
    return {
      stats: { graphicMaterialSets },
      elapsed: performance.now() - start,
    };
  },
});
