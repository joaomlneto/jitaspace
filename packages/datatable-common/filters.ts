import type {
  DataTableColumnFilter,
  DataTableFilterOption,
} from "@jitaspace/datatable";

import { compareSortKeys, primitiveString } from "./values";

/** `[min, max]`; `null` leaves that end of the range open. */
export type NumberRange = [number | null, number | null];

/** `[start, end]` as local `YYYY-MM-DD` days; `null` leaves that end open. */
export type DayRange = [string | null, string | null];

/**
 * What a column filter control holds: a string for `text` and `select`, a list
 * for `multi-select`, a {@link NumberRange}, a boolean, or a {@link DayRange}.
 * Engines store it opaquely per column, so every reader re-checks its shape.
 */
export type ColumnFilterValue =
  | string
  | string[]
  | NumberRange
  | DayRange
  | boolean;

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isPair<T>(
  value: unknown,
  isItem: (item: unknown) => item is T,
): value is [T | null, T | null] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((item) => item === null || isItem(item))
  );
}

const isNumber = (item: unknown): item is number =>
  typeof item === "number" && !Number.isNaN(item);
const isString = (item: unknown): item is string => typeof item === "string";

export const isNumberRange = (value: unknown): value is NumberRange =>
  isPair(value, isNumber);
export const isDayRange = (value: unknown): value is DayRange =>
  isPair(value, isString);

/**
 * Whether a filter value actually restricts anything. An inactive value is
 * removed from the table's state rather than stored, so "no filter" has exactly
 * one representation.
 */
export function isColumnFilterActive(
  filter: DataTableColumnFilter,
  value: unknown,
): value is ColumnFilterValue {
  switch (filter.type) {
    case "text":
    case "select":
      return typeof value === "string" && value !== "";
    case "multi-select":
      return isStringArray(value) && value.length > 0;
    case "range":
      return isNumberRange(value) && value.some((bound) => bound !== null);
    case "boolean":
      return typeof value === "boolean";
    case "date-range":
      return isDayRange(value) && value.some((bound) => bound !== null);
  }
}

/**
 * The strings a value is matched (and faceted) by: the stringified value, or
 * one per element for an array. Empty strings are not values.
 */
export function filterKeys(value: unknown): string[] {
  const items: unknown[] = Array.isArray(value) ? value : [value];
  return items.map(primitiveString).filter((key) => key !== "");
}

const pad = (n: number) => String(n).padStart(2, "0");

/** A date-like value as a local `YYYY-MM-DD` day, or `undefined` if it is not one. */
export function toLocalDay(value: unknown): string | undefined {
  let date: Date;
  if (value instanceof Date) date = value;
  else if (typeof value === "string" || typeof value === "number")
    date = new Date(value);
  else return undefined;
  if (Number.isNaN(date.getTime())) return undefined;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function inRange<T extends string | number>(
  value: T,
  range: readonly [T | null, T | null],
): boolean {
  const [start, end] = range;
  return (start === null || value >= start) && (end === null || value <= end);
}

/**
 * Whether a row's filter value passes a column filter. An inactive (or
 * malformed) filter value passes everything. See `DataTableColumnFilter` for
 * the semantics of each type.
 */
export function matchesColumnFilter(
  filter: DataTableColumnFilter,
  rowValue: unknown,
  filterValue: unknown,
): boolean {
  if (!isColumnFilterActive(filter, filterValue)) return true;
  switch (filter.type) {
    case "text": {
      const needle = String(filterValue).trim().toLowerCase();
      return filterKeys(rowValue).some((key) =>
        key.toLowerCase().includes(needle),
      );
    }
    case "select":
      return filterKeys(rowValue).includes(filterValue as string);
    case "multi-select": {
      const selected = filterValue as string[];
      return filterKeys(rowValue).some((key) => selected.includes(key));
    }
    case "range":
      return (
        isNumber(rowValue) && inRange(rowValue, filterValue as NumberRange)
      );
    case "boolean":
      return Boolean(rowValue) === filterValue;
    case "date-range": {
      const day = toLocalDay(rowValue);
      return day !== undefined && inRange(day, filterValue as DayRange);
    }
  }
}

/** Every distinct value present, as select options in natural sort order. */
export function facetOptions(
  values: Iterable<unknown>,
): DataTableFilterOption[] {
  const keys = new Set<string>();
  for (const value of values) {
    for (const key of filterKeys(value)) keys.add(key);
  }
  return [...keys]
    .sort((a, b) => compareSortKeys(a, b))
    .map((key) => ({ value: key, label: key }));
}

/** The smallest and largest number present, or `undefined` if there are none. */
export function numericBounds(
  values: Iterable<unknown>,
): { min: number; max: number } | undefined {
  let bounds: { min: number; max: number } | undefined;
  for (const value of values) {
    if (!isNumber(value)) continue;
    bounds = bounds
      ? { min: Math.min(bounds.min, value), max: Math.max(bounds.max, value) }
      : { min: value, max: value };
  }
  return bounds;
}
