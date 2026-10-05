"use client";

import type {
  ColumnDef,
  ColumnFiltersState,
  ColumnVisibilityState,
  FilterFn,
  OnChangeFn,
  PaginationState,
  RowData,
  SortingState,
} from "@tanstack/react-table";
import type { KeyboardEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  Center,
  Group,
  Pagination,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { flexRender, useTable } from "@tanstack/react-table";

import type { DataTableColumn, DataTableProps } from "@jitaspace/datatable";
import type { SortKey } from "@jitaspace/datatable-common";
import {
  ColumnFilterButton,
  ColumnFilterControl,
  columnSortKey,
  compareSortKeys,
  DataTableToolbar,
  matchesColumnFilter,
  matchesGlobalFilter,
  primitiveString,
  readColumnValue,
  readFilterValue,
} from "@jitaspace/datatable-common";

import type { Features } from "./features";
import { features } from "./features";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/** Skeleton rows rendered while loading without pagination. */
const UNPAGINATED_SKELETON_ROWS = 10;

/** The standard page sizes, plus the table's own default if it is not one. */
function pageSizeOptions(defaultPageSize: number): string[] {
  return [...new Set([...PAGE_SIZE_OPTIONS, defaultPageSize])]
    .sort((a, b) => a - b)
    .map(String);
}

function getSortIcon(sorted: "asc" | "desc" | false): string {
  if (sorted === "asc") return "↑";
  if (sorted === "desc") return "↓";
  return "⇅";
}

function alignToJustify(
  align: DataTableColumn<object>["align"],
): "flex-start" | "center" | "flex-end" {
  if (align === "right") return "flex-end";
  if (align === "center") return "center";
  return "flex-start";
}

/** For a sortable header; "none" tells assistive tech it can be sorted. */
function ariaSort(sorted: "asc" | "desc" | false) {
  if (sorted === "asc") return "ascending";
  if (sorted === "desc") return "descending";
  return "none";
}

/**
 * Translate the engine-agnostic columns into TanStack column defs.
 *
 * TanStack's own notion of a column's value is the *sort key*: that lets its
 * `sortUndefined: "last"` keep rows without one at the bottom in both
 * directions, which a comparator alone cannot (it is never told the
 * direction). Rendering, searching and filtering read the raw value through
 * `@jitaspace/datatable-common` instead, exactly as the mantine-datatable
 * engine does.
 */
function buildColumnDefs<TData extends RowData>(
  columns: DataTableColumn<TData>[],
): ColumnDef<Features, TData>[] {
  return columns.map((col) => {
    const filter = col.filter;
    const filterFn: FilterFn<Features, TData> | undefined = filter
      ? (row, _columnId, filterValue) =>
          matchesColumnFilter(
            filter,
            readFilterValue(col, row.original),
            filterValue,
          )
      : undefined;
    return {
      id: col.id,
      header: col.header,
      accessorFn: (row: TData): SortKey => columnSortKey(col, row),
      enableSorting: col.sortable ?? false,
      sortUndefined: "last",
      sortFn: (a, b, columnId) =>
        // Only reached when both keys are present (see `sortUndefined`).
        compareSortKeys(
          a.getValue<string | number>(columnId),
          b.getValue<string | number>(columnId),
        ),
      enableHiding: col.enableHiding ?? true,
      enableColumnFilter: filterFn !== undefined,
      enableGlobalFilter: col.accessor != null,
      ...(filterFn ? { filterFn } : {}),
      ...(typeof col.width === "number" ? { size: col.width } : {}),
      cell: (ctx) => {
        const value = readColumnValue(col, ctx.row.original);
        return col.cell
          ? col.cell(ctx.row.original, value)
          : primitiveString(value);
      },
    } satisfies ColumnDef<Features, TData>;
  });
}

export function DataTable<TData extends object>({
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
  verticalSpacing = "sm",
  fontSize,
}: Readonly<DataTableProps<TData>>) {
  const columnDefs = useMemo(() => buildColumnDefs(columns), [columns]);
  const columnsById = useMemo(
    () => new Map(columns.map((col) => [col.id, col])),
    [columns],
  );

  const [sorting, setSorting] = useState<SortingState>(
    initialSort
      ? [{ id: initialSort.columnId, desc: initialSort.direction === "desc" }]
      : [],
  );
  const [columnVisibility, setColumnVisibility] =
    useState<ColumnVisibilityState>(() =>
      columns.reduce<ColumnVisibilityState>((acc, col) => {
        if (col.defaultVisible === false) acc[col.id] = false;
        return acc;
      }, {}),
    );
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });

  // Back to the first page when what the rows are (search, filters) or their
  // order changes — but not when `data` merely gets a new identity. Callers
  // refetch (the LP store re-prices every 5 minutes) and some hooks return a
  // fresh array on every render; TanStack's own auto-reset would bounce the
  // reader to page 1 each time, so it is off and this replaces it.
  const resetPage = () =>
    setPagination((current) =>
      current.pageIndex === 0 ? current : { ...current, pageIndex: 0 },
    );
  const andResetPage =
    <T,>(setState: OnChangeFn<T>): OnChangeFn<T> =>
    (updater) => {
      setState(updater);
      resetPage();
    };

  const table = useTable({
    features,
    data,
    columns: columnDefs,
    ...(rowId ? { getRowId: (row: TData) => String(rowId(row)) } : {}),
    state: {
      sorting,
      globalFilter,
      columnFilters,
      columnVisibility,
      pagination,
    },
    onSortingChange: andResetPage(setSorting),
    onGlobalFilterChange: andResetPage(setGlobalFilter),
    onColumnFiltersChange: andResetPage(setColumnFilters),
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    // The pagination feature is always registered (v9 features are static);
    // without pagination, "manual" makes it pass every row through.
    manualPagination: !withPagination,
    autoResetPageIndex: false,
    // Sort the way mantine-datatable does, so the engines agree: one column at
    // a time, ascending on the first click, then toggling between directions.
    // TanStack's defaults would start numeric columns descending and add an
    // "unsorted" step — so a column that starts ascending (the market's sell
    // orders, by price) would lose its sort on the first click.
    enableMultiSort: false,
    enableSortingRemoval: false,
    sortDescFirst: false,
    // Search the raw value, not the sort key TanStack holds (a date column's
    // key is a timestamp nobody would type).
    globalFilterFn: (row, columnId, query: string) => {
      const col = columnsById.get(columnId);
      return (
        col !== undefined &&
        matchesGlobalFilter(readColumnValue(col, row.original), query)
      );
    },
    // TanStack only searches columns whose first value is a string or number
    // by default; `enableGlobalFilter` per column already says which to search.
    getColumnCanGlobalFilter: () => true,
  });

  // Data shrinking under the current page (a refetch, a wallet deselected)
  // would leave it past the end, showing "No data" while rows exist. Step back
  // to the last page — during render, so the empty page is never painted.
  const lastPageIndex = Math.max(table.getPageCount() - 1, 0);
  if (withPagination && pagination.pageIndex > lastPageIndex) {
    setPagination({ ...pagination, pageIndex: lastPageIndex });
  }

  const rows = table.getRowModel().rows;
  const visibleColumns = table.getVisibleLeafColumns();

  let tbodyContent: ReactNode;
  if (isLoading) {
    // A full page of placeholders, so the table is at its loaded height from
    // the first paint and the rows arriving do not shift the page.
    const skeletonRows = withPagination
      ? pagination.pageSize
      : UNPAGINATED_SKELETON_ROWS;
    tbodyContent = Array.from({ length: skeletonRows }, (_, index) => (
      <Table.Tr key={index} data-skeleton>
        {visibleColumns.map((column) => (
          <Table.Td key={column.id}>
            <Skeleton height={20} />
          </Table.Td>
        ))}
      </Table.Tr>
    ));
  } else if (rows.length === 0) {
    tbodyContent = (
      <Table.Tr>
        <Table.Td colSpan={Math.max(visibleColumns.length, 1)}>
          <Center py="xl">
            <Text c="dimmed">{emptyText}</Text>
          </Center>
        </Table.Td>
      </Table.Tr>
    );
  } else {
    tbodyContent = rows.map((row) => (
      <Table.Tr
        key={row.id}
        onClick={onRowClick ? () => onRowClick(row.original) : undefined}
        style={onRowClick ? { cursor: "pointer" } : undefined}
      >
        {row.getVisibleCells().map((cell) => (
          <Table.Td key={cell.id} ta={columnsById.get(cell.column.id)?.align}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </Table.Td>
        ))}
      </Table.Tr>
    ));
  }

  const hideableColumns = table
    .getAllLeafColumns()
    .filter((column) => column.getCanHide())
    .map((column) => ({
      id: column.id,
      label: columnsById.get(column.id)?.header ?? column.id,
      visible: column.getIsVisible(),
    }));

  return (
    <Stack gap="sm">
      <DataTableToolbar
        withGlobalFilter={withGlobalFilter}
        globalFilter={globalFilter}
        // Through the table, so the search goes back to the first page.
        onGlobalFilterChange={(value) => table.setGlobalFilter(value)}
        withColumnVisibility={withColumnVisibility}
        hideableColumns={hideableColumns}
        onToggleColumn={(id) => table.getColumn(id)?.toggleVisibility()}
        onToggleAllColumns={() =>
          table.toggleAllColumnsVisible(!table.getIsAllColumnsVisible())
        }
        activeFilterCount={columnFilters.length}
        onClearFilters={() => table.resetColumnFilters(true)}
      />

      <Table.ScrollContainer minWidth={400}>
        <Table
          striped={striped}
          highlightOnHover={highlightOnHover}
          withTableBorder={withTableBorder}
          withColumnBorders={withColumnBorders}
          verticalSpacing={verticalSpacing}
          fz={fontSize}
        >
          <Table.Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const column = header.column;
                  const canSort = column.getCanSort();
                  const sorted = column.getIsSorted();
                  const meta = columnsById.get(column.id);
                  const toggleSorting = column.getToggleSortingHandler();
                  return (
                    <Table.Th
                      key={header.id}
                      ta={meta?.align}
                      w={meta?.width}
                      aria-sort={canSort ? ariaSort(sorted) : undefined}
                      onClick={canSort ? toggleSorting : undefined}
                      // Sortable from the keyboard too: focusable, and Enter or
                      // Space sorts — unless it was pressed on the filter
                      // button inside the header.
                      tabIndex={canSort ? 0 : undefined}
                      onKeyDown={
                        canSort
                          ? (event: KeyboardEvent<HTMLTableCellElement>) => {
                              if (event.target !== event.currentTarget) return;
                              if (event.key !== "Enter" && event.key !== " ")
                                return;
                              event.preventDefault();
                              toggleSorting?.(event);
                            }
                          : undefined
                      }
                      style={
                        canSort
                          ? { cursor: "pointer", userSelect: "none" }
                          : undefined
                      }
                    >
                      {header.isPlaceholder ? null : (
                        <Group
                          gap={4}
                          wrap="nowrap"
                          justify={alignToJustify(meta?.align)}
                        >
                          {flexRender(
                            column.columnDef.header,
                            header.getContext(),
                          )}
                          {canSort && (
                            <Text size="xs" c="dimmed" component="span">
                              {getSortIcon(sorted)}
                            </Text>
                          )}
                          {meta?.filter && (
                            <ColumnFilterButton
                              label={meta.header}
                              active={column.getIsFiltered()}
                            >
                              <ColumnFilterControl
                                column={meta}
                                rows={data}
                                value={column.getFilterValue()}
                                onChange={(value) =>
                                  column.setFilterValue(value)
                                }
                              />
                            </ColumnFilterButton>
                          )}
                        </Group>
                      )}
                    </Table.Th>
                  );
                })}
              </Table.Tr>
            ))}
          </Table.Thead>
          <Table.Tbody>{tbodyContent}</Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      {withPagination && (
        <Group justify="space-between">
          <Group gap="xs">
            <Text size="sm">Rows per page:</Text>
            <Select
              aria-label="Rows per page"
              value={String(pagination.pageSize)}
              onChange={(value) =>
                table.setPageSize(Number(value ?? defaultPageSize))
              }
              data={pageSizeOptions(defaultPageSize)}
              allowDeselect={false}
              w={80}
              size="xs"
            />
          </Group>
          <Pagination
            total={table.getPageCount()}
            value={pagination.pageIndex + 1}
            onChange={(page) => table.setPageIndex(page - 1)}
            size="sm"
          />
          <Text size="sm" c="dimmed">
            {table.getFilteredRowModel().rows.length} rows
          </Text>
        </Group>
      )}
    </Stack>
  );
}
