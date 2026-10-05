/**
 * `@jitaspace/datatable` — the engine-agnostic DataTable contract.
 *
 * This package contains **only types**. It defines the column descriptor and
 * component props that every concrete implementation must satisfy, so the rest
 * of the app can depend on a stable API and swap the rendering engine freely:
 *
 *   - `@jitaspace/datatable-tanstack` — TanStack Table, styled with Mantine
 *   - `@jitaspace/datatable-mantine`  — the `mantine-datatable` library
 *
 * Both export a `DataTable` component assignable to {@link DataTableComponent}.
 * The runtime semantics they share — how a value sorts, what a filter matches —
 * live in `@jitaspace/datatable-common`, so the two engines cannot drift apart.
 */
import type { ReactNode } from "react";

export type SortDirection = "asc" | "desc";

export type ColumnAlign = "left" | "center" | "right";

/** One choice offered by a `select` or `multi-select` column filter. */
export interface DataTableFilterOption {
  /** Compared against the row's filter value, stringified. */
  value: string;
  /** Text shown in the dropdown. */
  label: string;
}

/**
 * A per-column filter, shown as a control in the column's header. Every variant
 * tests the column's filter value — {@link DataTableColumn.filterAccessor}, or
 * the {@link DataTableColumn.accessor} value when that is omitted.
 *
 * - `text` — case-insensitive substring match.
 * - `select` — exact match against one chosen option.
 * - `multi-select` — exact match against any of the chosen options. Never a
 *   substring match: picking "Brokers Fee" must not also keep "Contract Brokers
 *   Fee".
 * - `range` — inclusive numeric range; either bound may be left open. Rows
 *   whose value is not a number are dropped while a bound is set.
 * - `boolean` — the value's truthiness equals the chosen Yes / No.
 * - `date-range` — inclusive range of whole local days; either bound may be
 *   left open. The value may be a `Date`, an ISO string or a timestamp.
 *
 * For `select` and `multi-select`, omitting `options` offers every distinct
 * value present in the data. An array value matches when any element does.
 */
export type DataTableColumnFilter =
  | { type: "text" }
  | { type: "select"; options?: DataTableFilterOption[] }
  | { type: "multi-select"; options?: DataTableFilterOption[] }
  | { type: "range"; min?: number; max?: number; step?: number }
  | { type: "boolean" }
  | { type: "date-range" };

/** Mantine-aligned size scale, kept as a primitive union so this package has
 * no dependency on `@mantine/core`. */
export type DataTableSize = "xs" | "sm" | "md" | "lg" | "xl";

/**
 * A single column definition, expressed independently of any table engine.
 * Each adapter translates this into its engine's native column shape.
 */
export interface DataTableColumn<TData> {
  /** Stable, unique id. Used as the key for sorting and visibility state. */
  id: string;
  /** Human-readable header text. Also the label shown in the column-visibility menu. */
  header: string;
  /**
   * How to read this column's raw value from a row — either a key of `TData`
   * or a getter function. Drives default rendering, global-filter matching, and
   * (unless {@link sortAccessor} is given) sorting. Omit for display-only
   * columns that render directly from the row via {@link cell}.
   */
  accessor?: keyof TData | ((row: TData) => unknown);
  /**
   * Custom cell renderer. Receives the row and the value produced by
   * {@link accessor} (or `undefined` when there is no accessor). When omitted,
   * the accessed value is rendered as text.
   */
  cell?: (row: TData, value: unknown) => ReactNode;
  /**
   * Allow sorting by this column from its header (click, or Enter on the
   * focused header). One column at a time: ascending first, then toggling.
   * Rows without a sort value (`null`, `undefined`, `""`, an invalid date)
   * sort last in either direction. Default: `false`.
   */
  sortable?: boolean;
  /**
   * Custom sort key. When provided, sorting compares the values returned by
   * this function instead of the raw accessor value (e.g. sort an entity column
   * by its resolved name). Only relevant when {@link sortable} is `true`.
   */
  sortAccessor?: (row: TData) => string | number | null | undefined;
  /** Add a filter control to this column's header. */
  filter?: DataTableColumnFilter;
  /**
   * The value {@link filter} tests, when it should differ from the
   * {@link accessor} value (e.g. filter an entity column by name while it sorts
   * by id). Only relevant when {@link filter} is set.
   */
  filterAccessor?: (row: TData) => unknown;
  /** Whether the column may be hidden via the visibility menu. Default: `true`. */
  enableHiding?: boolean;
  /** Initial visibility of the column. Default: `true`. */
  defaultVisible?: boolean;
  /** Horizontal alignment of the header and its cells. Default: `"left"`. */
  align?: ColumnAlign;
  /** Fixed column width, in pixels. */
  width?: number;
}

/** The active sort, identified by {@link DataTableColumn.id}. */
export interface DataTableSort {
  columnId: string;
  direction: SortDirection;
}

/**
 * Props shared by every DataTable implementation. Implementations may extend
 * this, but must accept everything here with identical semantics.
 *
 * A row is an object (or array): TanStack Table v9 requires it, and a column's
 * `accessor` names one of its keys anyway.
 */
export interface DataTableProps<TData extends object> {
  /** The rows to display. */
  data: TData[];
  /** Column definitions. */
  columns: DataTableColumn<TData>[];

  /**
   * Render a page of skeleton rows in place of the data — one per row of the
   * current page size, or 10 without pagination — so the table already has its
   * loaded height and the rows arriving do not push the page down.
   */
  isLoading?: boolean;
  /** Message shown when there are no rows. Default: `"No data"`. */
  emptyText?: string;

  /**
   * Render a search box that filters rows across all accessor columns,
   * hidden ones included.
   */
  withGlobalFilter?: boolean;
  /** Render a "Columns" control to show/hide individual columns. */
  withColumnVisibility?: boolean;
  /** Render pagination controls and a page-size selector. */
  withPagination?: boolean;
  /**
   * Page size used when {@link withPagination} is enabled; offered in the
   * rows-per-page choices even when it is not a standard size. The current
   * page survives a change of `data` identity, and steps back if the data
   * shrinks under it. Default: `10`.
   */
  defaultPageSize?: number;

  /** Initial sort applied on first render. Must name a sortable column. */
  initialSort?: DataTableSort;
  /** Called with the row's data when a row is clicked. */
  onRowClick?: (row: TData) => void;
  /** Stable unique key for a row. Defaults to the row's index. */
  rowId?: (row: TData) => string | number;

  // --- presentation (a neutral subset both engines support) ---
  /** Zebra-stripe rows. */
  striped?: boolean;
  /** Highlight the row under the cursor. */
  highlightOnHover?: boolean;
  /** Draw a border around the table. */
  withTableBorder?: boolean;
  /** Draw borders between columns. */
  withColumnBorders?: boolean;
  /** Vertical cell padding. Default: `"sm"`. */
  verticalSpacing?: DataTableSize;
  /** Base font size. */
  fontSize?: DataTableSize;
}

/**
 * The component signature every implementation exports as `DataTable`. Use it
 * to type a variable that holds whichever implementation you picked:
 *
 * ```ts
 * import type { DataTableComponent } from "@jitaspace/datatable";
 * import { DataTable } from "@jitaspace/datatable-tanstack";
 * const Table: DataTableComponent = DataTable;
 * ```
 */
export type DataTableComponent = <TData extends object>(
  props: DataTableProps<TData>,
) => ReactNode;
