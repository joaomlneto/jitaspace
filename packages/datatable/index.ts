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
 */
import type { ReactNode } from "react";

export type SortDirection = "asc" | "desc";

export type ColumnAlign = "left" | "center" | "right";

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
  /** Allow click-to-sort on this column's header. Default: `false`. */
  sortable?: boolean;
  /**
   * Custom sort key. When provided, sorting compares the values returned by
   * this function instead of the raw accessor value (e.g. sort an entity column
   * by its resolved name). Only relevant when {@link sortable} is `true`.
   */
  sortAccessor?: (row: TData) => string | number | null | undefined;
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
 */
export interface DataTableProps<TData> {
  /** The rows to display. */
  data: TData[];
  /** Column definitions. */
  columns: DataTableColumn<TData>[];

  /** Show a loading indicator instead of rows. */
  isLoading?: boolean;
  /** Message shown when there are no rows. Default: `"No data"`. */
  emptyText?: string;

  /** Render a search box that filters rows across all accessor columns. */
  withGlobalFilter?: boolean;
  /** Render a "Columns" control to show/hide individual columns. */
  withColumnVisibility?: boolean;
  /** Render pagination controls and a page-size selector. */
  withPagination?: boolean;
  /** Page size used when {@link withPagination} is enabled. Default: `10`. */
  defaultPageSize?: number;

  /** Initial sort applied on first render. */
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
export type DataTableComponent = <TData>(
  props: DataTableProps<TData>,
) => ReactNode;
