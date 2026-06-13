"use client";

import { useMemo } from "react";
import {
  MantineReactTable,
  type MRT_ColumnDef,
  type MRT_DensityState,
  type MRT_SortingState,
  type MRT_VisibilityState,
  useMantineReactTable,
} from "mantine-react-table";

import type {
  DataTableColumn,
  DataTableProps,
  DataTableSize,
} from "@jitaspace/datatable";

function readValue<TData>(col: DataTableColumn<TData>, row: TData): unknown {
  if (typeof col.accessor === "function") return col.accessor(row);
  if (col.accessor != null) return row[col.accessor];
  return undefined;
}

/** Only primitives participate in MRT's sorting/global-filter; object/array
 * accessor values (e.g. a list column) are excluded so they don't pollute the
 * global filter or sort meaninglessly. Custom `cell` renderers still render them. */
function filterableValue(value: unknown): string | number | undefined {
  if (typeof value === "number" || typeof value === "string") return value;
  return undefined;
}

function compareValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

function toDensity(verticalSpacing: DataTableSize | undefined): MRT_DensityState {
  switch (verticalSpacing) {
    case "md":
      return "md";
    case "lg":
    case "xl":
      return "xl";
    default:
      return "xs";
  }
}

/**
 * `mantine-react-table` implementation of the agnostic DataTable contract — the
 * "classic" engine. Translates {@link DataTableColumn}s into MRT column defs and
 * maps the shared props onto MRT's options.
 */
export function MantineReactTableImpl<TData>({
  data,
  columns,
  isLoading = false,
  emptyText = "No data",
  withGlobalFilter = false,
  withColumnVisibility = false,
  withPagination = false,
  defaultPageSize = 10,
  initialSort,
  onRowClick,
  rowId,
  striped,
  highlightOnHover,
  withTableBorder,
  withColumnBorders,
  verticalSpacing,
  fontSize,
}: Readonly<DataTableProps<TData>>) {
  // MRT constrains rows to MRT_RowData (an index signature). Intersect locally
  // to satisfy that without constraining the public, agnostic generic.
  type Row = TData & Record<string, unknown>;

  const mrtColumns = useMemo<MRT_ColumnDef<Row>[]>(
    () =>
      columns.map((col) => ({
        id: col.id,
        header: col.header,
        accessorFn: (row) => filterableValue(readValue(col, row)),
        enableSorting: col.sortable ?? false,
        enableHiding: col.enableHiding ?? true,
        ...(col.width != null ? { size: col.width } : {}),
        ...(col.sortAccessor
          ? {
              sortingFn: (a, b) =>
                compareValues(
                  col.sortAccessor!(a.original),
                  col.sortAccessor!(b.original),
                ),
            }
          : {}),
        ...(col.cell
          ? { Cell: ({ row }) => col.cell!(row.original, readValue(col, row.original)) }
          : {}),
        ...(col.align
          ? {
              mantineTableHeadCellProps: { align: col.align },
              mantineTableBodyCellProps: { align: col.align },
            }
          : {}),
      })),
    [columns],
  );

  const initialSorting = useMemo<MRT_SortingState>(
    () =>
      initialSort
        ? [{ id: initialSort.columnId, desc: initialSort.direction === "desc" }]
        : [],
    [initialSort],
  );

  const initialColumnVisibility = useMemo<MRT_VisibilityState>(
    () =>
      columns.reduce<MRT_VisibilityState>((acc, col) => {
        if (col.defaultVisible === false) acc[col.id] = false;
        return acc;
      }, {}),
    [columns],
  );

  const table = useMantineReactTable<Row>({
    columns: mrtColumns,
    data: data as Row[],
    enableSorting: true,
    enableColumnFilters: false,
    enableGlobalFilter: withGlobalFilter,
    enableHiding: withColumnVisibility,
    enableColumnActions: withColumnVisibility,
    enablePagination: withPagination,
    enableTopToolbar: withGlobalFilter || withColumnVisibility,
    enableBottomToolbar: withPagination,
    ...(rowId ? { getRowId: (row) => String(rowId(row)) } : {}),
    state: { isLoading },
    initialState: {
      density: toDensity(verticalSpacing),
      showGlobalFilter: withGlobalFilter,
      sorting: initialSorting,
      columnVisibility: initialColumnVisibility,
      pagination: { pageIndex: 0, pageSize: defaultPageSize },
    },
    localization: { noRecordsToDisplay: emptyText },
    mantineTableProps: {
      striped,
      highlightOnHover,
      withTableBorder,
      withColumnBorders,
      ...(fontSize ? { fz: fontSize } : {}),
    },
    ...(onRowClick
      ? {
          mantineTableBodyRowProps: ({ row }) => ({
            onClick: () => onRowClick(row.original),
            style: { cursor: "pointer" },
          }),
        }
      : {}),
  });

  return <MantineReactTable table={table} />;
}
