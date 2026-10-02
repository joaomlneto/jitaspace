"use client";

import type {
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
  PaginationState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import type { ReactNode } from "react";
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
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

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

const PAGE_SIZE_OPTIONS = ["10", "25", "50", "100"];

/** Skeleton rows rendered while loading without pagination. */
const UNPAGINATED_SKELETON_ROWS = 10;

function getSortIcon(sorted: "asc" | "desc" | false): string {
  if (sorted === "asc") return "↑";
  if (sorted === "desc") return "↓";
  return "⇅";
}

function alignToJustify(
  align: DataTableColumn<unknown>["align"],
): "flex-start" | "center" | "flex-end" {
  if (align === "right") return "flex-end";
  if (align === "center") return "center";
  return "flex-start";
}

function ariaSort(sorted: "asc" | "desc" | false) {
  if (sorted === "asc") return "ascending";
  if (sorted === "desc") return "descending";
  return undefined;
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
function buildColumnDefs<TData>(
  columns: DataTableColumn<TData>[],
): ColumnDef<TData, SortKey>[] {
  return columns.map((col) => {
    const filter = col.filter;
    const filterFn: FilterFn<TData> | undefined = filter
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
      accessorFn: (row: TData) => columnSortKey(col, row),
      enableSorting: col.sortable ?? false,
      sortUndefined: "last",
      sortingFn: (a, b, columnId) =>
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
    } satisfies ColumnDef<TData, SortKey>;
  });
}

export function DataTable<TData>({
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
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () =>
      columns.reduce<VisibilityState>((acc, col) => {
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

  const table = useReactTable({
    data,
    columns: columnDefs,
    ...(rowId ? { getRowId: (row: TData) => String(rowId(row)) } : {}),
    state: {
      sorting,
      globalFilter,
      columnFilters,
      columnVisibility,
      ...(withPagination ? { pagination } : {}),
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    ...(withPagination ? { onPaginationChange: setPagination } : {}),
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
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(withPagination
      ? { getPaginationRowModel: getPaginationRowModel() }
      : {}),
  });

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
        onGlobalFilterChange={setGlobalFilter}
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
                  return (
                    <Table.Th
                      key={header.id}
                      ta={meta?.align}
                      w={meta?.width}
                      aria-sort={canSort ? ariaSort(sorted) : undefined}
                      onClick={
                        canSort ? column.getToggleSortingHandler() : undefined
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
              value={String(table.getState().pagination.pageSize)}
              onChange={(value) =>
                table.setPageSize(Number(value ?? defaultPageSize))
              }
              data={PAGE_SIZE_OPTIONS}
              w={80}
              size="xs"
            />
          </Group>
          <Pagination
            total={table.getPageCount()}
            value={table.getState().pagination.pageIndex + 1}
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
