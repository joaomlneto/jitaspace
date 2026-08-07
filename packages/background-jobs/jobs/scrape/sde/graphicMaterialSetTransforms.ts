import type { Prisma } from "../../../db";

/**
 * Pure transforms for graphicMaterialSets.yaml. Type-only `Prisma` import, so
 * this module is unit-testable without mocking p-limit or the env.
 */

const optionalNumber = (value: unknown): number | null =>
  value == null ? null : Number(value);

const plainString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

/** Pull r/g/b/a out of one of the RGBA colour sub-objects. */
export function rgba(value: unknown): {
  r: number | null;
  g: number | null;
  b: number | null;
  a: number | null;
} {
  const color = (value ?? {}) as Record<string, unknown>;
  return {
    r: optionalNumber(color.r),
    g: optionalNumber(color.g),
    b: optionalNumber(color.b),
    a: optionalNumber(color.a),
  };
}

/**
 * Build the GraphicMaterialSet row. The four RGBA colours are flattened into
 * prefixed columns, as ingestSdeMetaGroups does for `color`.
 */
export function toGraphicMaterialSetRow(
  materialSetId: number,
  record: Record<string, unknown>,
): Prisma.GraphicMaterialSetCreateManyInput {
  const hull = rgba(record.colorHull);
  const primary = rgba(record.colorPrimary);
  const secondary = rgba(record.colorSecondary);
  const window = rgba(record.colorWindow);
  return {
    materialSetId,
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
}
