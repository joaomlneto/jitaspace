import type { ReactNode } from "react";

import { formatValue } from "~/lib/history";

export const KIND_COLOR = {
  added: "green",
  removed: "red",
  modified: "blue",
} as const;
export const DELTA_COLOR = {
  added: "green",
  removed: "red",
  changed: "blue",
} as const;

// ── smart delta rendering ───────────────────────────────────────────────────
// Field values from typeDogma / typeMaterials / requiredSkills* are arrays or
// maps of sub-records. Since events store the whole before/after value, the UI
// can compute a readable element-level sub-diff instead of dumping JSON.

export const SUB_KEY_FIELDS = [
  "attributeID",
  "effectID",
  "materialTypeID",
  "skillTypeID",
  "typeID",
  "id",
];
// Collapse long entry lists past roughly a dozen rows (Mantine Spoiler).
export const SPOILER_MAX_HEIGHT = 220;

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** The identifying field shared by every element of an array of records. */
export function arrayKeyOf(arr: unknown[]): string | null {
  if (arr.length === 0 || !arr.every(isPlainObject)) return null;
  return SUB_KEY_FIELDS.find((k) => arr.every((o) => k in o)) ?? null;
}

export function keyLabel(v: unknown): string {
  return typeof v === "number" || typeof v === "string"
    ? String(v)
    : formatValue(v);
}

/** One-line summary of a sub-record, omitting its identifying field. */
export function restSummary(
  obj: Record<string, unknown>,
  keyField: string,
): string {
  const rest = Object.entries(obj).filter(([k]) => k !== keyField);
  if (rest.length === 1 && rest[0]) return formatValue(rest[0][1]);
  return rest.map(([k, v]) => `${k}: ${formatValue(v)}`).join(", ");
}

/** Short summary for whole-field added/removed values. */
export function summarize(v: unknown): string {
  if (Array.isArray(v))
    return `${v.length} ${v.length === 1 ? "entry" : "entries"}`;
  return formatValue(v);
}

/**
 * Best-effort English label for an SDE entity. Entities are inconsistent:
 * dogma attributes use `name` (string) + localized `displayName`; groups and
 * market groups use a localized `name`; races use a localized `nameID`.
 */
export function sdeLabel(data: unknown): string | undefined {
  const d = data as
    | {
        name?: string | { en?: string };
        displayName?: { en?: string };
        nameID?: { en?: string };
      }
    | undefined;
  if (!d) return undefined;
  const display = d.displayName?.en?.trim();
  if (display) return display;
  if (typeof d.name === "string") return d.name.trim() || undefined;
  const localizedName = d.name?.en?.trim();
  if (localizedName) return localizedName;
  return d.nameID?.en?.trim() ?? undefined;
}

export interface SubRow {
  key: string;
  kind: "added" | "removed" | "changed";
  /** Optional leading node (e.g. a named, linked entity). */
  label?: ReactNode;
  /** Trailing text — or, when set, a rich trailing node rendered in its place. */
  text: string;
  node?: ReactNode;
}

// ── recursive deep diff ─────────────────────────────────────────────────────
// Objects and arrays are walked recursively; only the leaves that actually
// differ are surfaced, each labelled by its path — so a changed stargate shows
// "50001248 › ignoredByCorporationDefenseDjinn: false", not its whole record.

export interface Leaf {
  path: string[];
  kind: "added" | "removed" | "changed";
  from?: unknown;
  to?: unknown;
}

export const deepEqual = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

/** Flatten a whole (added or removed) subtree into one leaf per scalar. */
export function enumerateLeaves(
  value: unknown,
  path: string[],
  kind: "added" | "removed",
): Leaf[] {
  if (isPlainObject(value)) {
    return Object.entries(value).flatMap(([k, v]) =>
      enumerateLeaves(v, [...path, k], kind),
    );
  }
  if (Array.isArray(value)) {
    const keyField = arrayKeyOf(value);
    if (keyField && value.every(isPlainObject)) {
      return value.flatMap((o) =>
        enumerateLeaves(o, [...path, keyLabel(o[keyField])], kind),
      );
    }
    return value.flatMap((v, i) =>
      enumerateLeaves(v, [...path, `[${i}]`], kind),
    );
  }
  return [
    { path, kind, ...(kind === "added" ? { to: value } : { from: value }) },
  ];
}

/**
 * Recursively collect the differing leaves between two (possibly nested)
 * values. Dispatches to a strategy per shape; the helpers below do the work.
 */
export function diffLeaves(
  from: unknown,
  to: unknown,
  path: string[] = [],
): Leaf[] {
  if (isPlainObject(from) && isPlainObject(to))
    return diffObjects(from, to, path);
  if (Array.isArray(from) && Array.isArray(to))
    return diffArrays(from, to, path);
  // scalar / type-mismatch leaf
  return deepEqual(from, to) ? [] : [{ path, kind: "changed", from, to }];
}

/** Both plain objects → compare key by key (order-independent). */
function diffObjects(
  from: Record<string, unknown>,
  to: Record<string, unknown>,
  path: string[],
): Leaf[] {
  const out: Leaf[] = [];
  for (const k of new Set([...Object.keys(from), ...Object.keys(to)])) {
    const inFrom = k in from;
    const inTo = k in to;
    if (inFrom && inTo) out.push(...diffLeaves(from[k], to[k], [...path, k]));
    else if (inTo) out.push(...enumerateLeaves(to[k], [...path, k], "added"));
    else out.push(...enumerateLeaves(from[k], [...path, k], "removed"));
  }
  return out;
}

/** Both arrays → pick the element-matching strategy by element shape. */
function diffArrays(from: unknown[], to: unknown[], path: string[]): Leaf[] {
  // arrays of records sharing an id → diff by that id (stable across reorders)
  const keyField = arrayKeyOf(from) ?? arrayKeyOf(to);
  if (keyField && from.every(isPlainObject) && to.every(isPlainObject))
    return diffKeyedArrays(from, to, keyField, path);
  // arrays of primitives → set diff of the elements (under this path)
  if (!from.some(isPlainObject) && !to.some(isPlainObject))
    return diffPrimitiveArrays(from, to, path);
  // positional / mixed arrays → diff element by element
  return diffPositionalArrays(from, to, path);
}

/** Arrays of records keyed by a shared id field, matched across reorders. */
function diffKeyedArrays(
  from: Record<string, unknown>[],
  to: Record<string, unknown>[],
  keyField: string,
  path: string[],
): Leaf[] {
  const fromMap = new Map(from.map((o) => [keyLabel(o[keyField]), o]));
  const toMap = new Map(to.map((o) => [keyLabel(o[keyField]), o]));
  const out: Leaf[] = [];
  for (const [k, v] of fromMap) {
    const next = toMap.get(k);
    if (next) out.push(...diffLeaves(v, next, [...path, k]));
    else out.push(...enumerateLeaves(v, [...path, k], "removed"));
  }
  for (const [k, v] of toMap)
    if (!fromMap.has(k)) out.push(...enumerateLeaves(v, [...path, k], "added"));
  return out;
}

/** Arrays of primitives → set diff of the elements (empty ⇒ pure reorder). */
function diffPrimitiveArrays(
  from: unknown[],
  to: unknown[],
  path: string[],
): Leaf[] {
  const fromSet = new Set(from.map(keyLabel));
  const toSet = new Set(to.map(keyLabel));
  const out: Leaf[] = [];
  for (const v of fromSet)
    if (!toSet.has(v)) out.push({ path, kind: "removed", from: v });
  for (const v of toSet)
    if (!fromSet.has(v)) out.push({ path, kind: "added", to: v });
  return out;
}

/** Positional / mixed arrays → diff element by element. */
function diffPositionalArrays(
  from: unknown[],
  to: unknown[],
  path: string[],
): Leaf[] {
  const out: Leaf[] = [];
  const len = Math.max(from.length, to.length);
  for (let i = 0; i < len; i++) {
    const k = `[${i}]`;
    if (i >= from.length)
      out.push(...enumerateLeaves(to[i], [...path, k], "added"));
    else if (i >= to.length)
      out.push(...enumerateLeaves(from[i], [...path, k], "removed"));
    else out.push(...diffLeaves(from[i], to[i], [...path, k]));
  }
  return out;
}
