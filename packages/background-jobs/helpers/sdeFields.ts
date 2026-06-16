/**
 * Typed accessors for raw SDE YAML records. `loadFile` returns records whose
 * values are `unknown`; these coerce a value into the shape a Prisma column
 * expects, keeping the ingest jobs free of unchecked `any` access.
 */

/** The English text of a localized SDE field (`{ en, de, ... }`), or null. */
export function enString(value: unknown): string | null {
  if (typeof value === "object" && value !== null) {
    const en = (value as { en?: unknown }).en;
    if (typeof en === "string") return en;
  }
  return null;
}

/** A plain (already-resolved) SDE string field, or null when absent. */
export function plainString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/** A required numeric SDE field (id / foreign key). */
export function requiredNumber(value: unknown): number {
  return Number(value);
}

/** An optional numeric SDE field — null when absent. */
export function optionalNumber(value: unknown): number | null {
  return value == null ? null : Number(value);
}

/** A required SDE field for a `BigInt` column (rounded; non-finite → 0n). */
export function requiredBigInt(value: unknown): bigint {
  const n = Number(value);
  return BigInt(Number.isFinite(n) ? Math.round(n) : 0);
}

/** A required boolean SDE field. */
export function requiredBoolean(value: unknown): boolean {
  return Boolean(value);
}

/** An optional boolean SDE field — null when absent. */
export function optionalBoolean(value: unknown): boolean | null {
  return value == null ? null : Boolean(value);
}
