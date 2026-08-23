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
export const requiredNumber: (value: unknown) => number = Number;

/** An optional numeric SDE field — null when absent. */
export function optionalNumber(value: unknown): number | null {
  return value == null ? null : Number(value);
}

/** A required SDE field for a `BigInt` column (rounded; non-finite → 0n). */
export function requiredBigInt(value: unknown): bigint {
  const n = Number(value);
  return BigInt(Number.isFinite(n) ? Math.round(n) : 0);
}

/**
 * An optional SDE field for a `BigInt` column — null when absent or non-finite.
 *
 * Reach for this over {@link optionalNumber} whenever a column counts a
 * quantity rather than identifying a row: ids fit int4, but ISK-denominated
 * figures (military-campaign progress, for one) run past it. Emitting `bigint`
 * and not `number` is also what keeps the ingest diff honest — `recordsAreEqual`
 * compares `typeof` before value, so a `number` held against the `bigint` Prisma
 * reads back would mark every row modified on every run.
 */
export function optionalBigInt(value: unknown): bigint | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? BigInt(Math.round(n)) : null;
}

/** A required boolean SDE field. */
export const requiredBoolean: (value: unknown) => boolean = Boolean;

/** An optional boolean SDE field — null when absent. */
export function optionalBoolean(value: unknown): boolean | null {
  return value == null ? null : Boolean(value);
}

/**
 * A fixed-key sub-object of an SDE record (`attributes`, `position2D`, …),
 * flattened into prefixed columns by the caller. An absent or non-object value
 * reads as empty, so every field inside it comes back as null.
 */
export function subRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * An optional SDE timestamp — `"2003-03-27 13:27:00"`, with no timezone. EVE
 * records these in UTC, so anchor them there rather than the runner's local zone.
 */
export function optionalSdeDate(value: unknown): Date | null {
  if (typeof value !== "string" || value === "") return null;
  const parsed = new Date(`${value.replace(" ", "T")}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
