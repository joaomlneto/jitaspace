import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { ingestSdeTable, optionalNumber, plainString } from "../../../helpers";

export interface IngestSdeGraphicMaterialSetsEventPayload {
  data: Record<string, never>;
}

/** Pull r/g/b/a out of one of the RGBA colour sub-objects. */
const rgba = (value: unknown) => {
  const color = (value ?? {}) as Record<string, unknown>;
  return {
    r: optionalNumber(color.r),
    g: optionalNumber(color.g),
    b: optionalNumber(color.b),
    a: optionalNumber(color.a),
  };
};

/**
 * graphicMaterialSets.yaml — the Space-Object-Factory material sets that
 * `Graphic.sofMaterialSetId` and `SkinMaterial.materialSetId` reference. The four
 * RGBA colours are flattened into prefixed columns, as ingestSdeMetaGroups does
 * for `color`.
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
      toRow: (record, id): Prisma.GraphicMaterialSetCreateManyInput => {
        const hull = rgba(record.colorHull);
        const primary = rgba(record.colorPrimary);
        const secondary = rgba(record.colorSecondary);
        const window = rgba(record.colorWindow);
        return {
          materialSetId: id,
          description: plainString(record.description),
          sofFactionName: plainString(record.sofFactionName),
          sofRaceHint: plainString(record.sofRaceHint),
          sofPatternName: plainString(record.sofPatternName),
          resPathInsert: plainString(record.resPathInsert),
          material1: plainString(record.material1),
          material2: plainString(record.material2),
          material3: plainString(record.material3),
          material4: plainString(record.material4),
          // CCP spells these all-lowercase in the SDE.
          customMaterial1: plainString(record.custommaterial1),
          customMaterial2: plainString(record.custommaterial2),
          colorHullR: hull.r,
          colorHullG: hull.g,
          colorHullB: hull.b,
          colorHullA: hull.a,
          colorPrimaryR: primary.r,
          colorPrimaryG: primary.g,
          colorPrimaryB: primary.b,
          colorPrimaryA: primary.a,
          colorSecondaryR: secondary.r,
          colorSecondaryG: secondary.g,
          colorSecondaryB: secondary.b,
          colorSecondaryA: secondary.a,
          colorWindowR: window.r,
          colorWindowG: window.g,
          colorWindowB: window.b,
          colorWindowA: window.a,
          isDeleted: false,
        };
      },
    });
    return {
      stats: { graphicMaterialSets },
      elapsed: performance.now() - start,
    };
  },
});
