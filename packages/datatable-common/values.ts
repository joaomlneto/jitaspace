import type { DataTableColumn } from "@jitaspace/datatable";

/**
 * What a column sorts by. `undefined` is "no value", which every engine sorts
 * last regardless of direction.
 */
export type SortKey = string | number | undefined;

/** The column's raw value for a row — what its `cell` renderer receives. */
export function readColumnValue<TData>(
  column: DataTableColumn<TData>,
  row: TData,
): unknown {
  const accessor = column.accessor;
  if (typeof accessor === "function") return accessor(row);
  if (accessor != null) return row[accessor];
  return undefined;
}

/** The value the column's filter tests. */
export function readFilterValue<TData>(
  column: DataTableColumn<TData>,
  row: TData,
): unknown {
  return column.filterAccessor
    ? column.filterAccessor(row)
    : readColumnValue(column, row);
}

/**
 * Stringify a primitive. Anything else becomes `""`, so an object or array
 * value never renders or matches as `"[object Object]"`.
 */
export function primitiveString(value: unknown): string {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  return "";
}

/**
 * Normalise a value into something comparable: numbers and strings as they
 * are, dates by timestamp, booleans as 0/1. Everything else — including
 * `null`, an invalid date and `NaN` — has no sort key.
 */
export function toSortKey(value: unknown): SortKey {
  if (typeof value === "number") return Number.isNaN(value) ? undefined : value;
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? undefined : time;
  }
  return undefined;
}

/** The column's sort key for a row: its `sortAccessor`, else its value. */
export function columnSortKey<TData>(
  column: DataTableColumn<TData>,
  row: TData,
): SortKey {
  return toSortKey(
    column.sortAccessor
      ? column.sortAccessor(row)
      : readColumnValue(column, row),
  );
}

// Numeric collation sorts "Item 9" before "Item 10"; one shared instance is far
// cheaper than `localeCompare` across thousands of rows.
const collator = new Intl.Collator(undefined, { numeric: true });

/**
 * Ascending comparison of two present sort keys. Callers handle `undefined`,
 * because "missing sorts last" has to hold in both directions and a comparator
 * cannot know which one it is sorting in.
 */
export function compareSortKeys(
  a: string | number,
  b: string | number,
): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return collator.compare(String(a), String(b));
}

/**
 * Sort rows by one column, keeping rows without a sort key last in either
 * direction. Stable: equal keys keep their input order.
 */
export function sortRows<TData>(
  rows: readonly TData[],
  column: DataTableColumn<TData>,
  direction: "asc" | "desc",
): TData[] {
  const sign = direction === "asc" ? 1 : -1;
  return rows
    .map((row) => ({ row, key: columnSortKey(column, row) }))
    .sort((a, b) => {
      if (a.key === undefined || b.key === undefined) {
        if (a.key === b.key) return 0;
        return a.key === undefined ? 1 : -1;
      }
      return sign * compareSortKeys(a.key, b.key);
    })
    .map(({ row }) => row);
}

/**
 * Whether a column value matches the global search. Case-insensitive substring
 * match on primitives; a blank query matches everything.
 */
export function matchesGlobalFilter(value: unknown, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === "") return true;
  return primitiveString(value).toLowerCase().includes(needle);
}

/** Whether any of the row's accessor columns matches the global search. */
export function rowMatchesGlobalFilter<TData>(
  columns: readonly DataTableColumn<TData>[],
  row: TData,
  query: string,
): boolean {
  if (query.trim() === "") return true;
  return columns.some(
    (column) =>
      column.accessor != null &&
      matchesGlobalFilter(readColumnValue(column, row), query),
  );
}
