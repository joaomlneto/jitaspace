"use client";

import { type ReactNode, useMemo, useState } from "react";
import {
  type Column,
  type ColumnDef,
  type PaginationState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Button,
  Center,
  Checkbox,
  Divider,
  Group,
  Loader,
  Pagination,
  Popover,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";

import type { DataTableColumn, DataTableProps } from "@jitaspace/datatable";

const PAGE_SIZE_OPTIONS = ["10", "25", "50", "100"];

function getSortIcon(sorted: "asc" | "desc" | false): string {
  if (sorted === "asc") return "↑";
  if (sorted === "desc") return "↓";
  return "⇅";
}

function renderValue(value: unknown): ReactNode {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  return "";
}

function alignToJustify(
  align: DataTableColumn<unknown>["align"],
): "flex-start" | "center" | "flex-end" {
  if (align === "right") return "flex-end";
  if (align === "center") return "center";
  return "flex-start";
}

/** Resolve the agnostic accessor into TanStack's accessorFn/accessorKey shape. */
function accessorPartFor<TData>(
  accessor: DataTableColumn<TData>["accessor"],
): Record<string, unknown> {
  if (typeof accessor === "function") return { accessorFn: accessor };
  if (typeof accessor === "string" || typeof accessor === "number") {
    return { accessorKey: String(accessor) };
  }
  return {};
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

/** Translate the engine-agnostic columns into TanStack column defs. */
function buildColumnDefs<TData>(
  columns: DataTableColumn<TData>[],
): ColumnDef<TData>[] {
  return columns.map((col) => {
    return {
      id: col.id,
      header: col.header,
      enableSorting: col.sortable ?? false,
      enableHiding: col.enableHiding ?? true,
      ...accessorPartFor(col.accessor),
      ...(typeof col.width === "number" ? { size: col.width } : {}),
      ...(col.sortAccessor
        ? {
            sortingFn: (a, b) =>
              compareValues(
                col.sortAccessor!(a.original),
                col.sortAccessor!(b.original),
              ),
          }
        : {}),
      cell: (ctx) =>
        col.cell
          ? col.cell(ctx.row.original, ctx.getValue())
          : renderValue(ctx.getValue()),
    } satisfies ColumnDef<TData>;
  });
}

// Prefer a string header for the visibility menu label; fall back to the id.
function columnLabel<TData>(column: Column<TData>): string {
  const header = column.columnDef.header;
  return typeof header === "string" && header.length > 0 ? header : column.id;
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
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() =>
    columns.reduce<VisibilityState>((acc, col) => {
      if (col.defaultVisible === false) acc[col.id] = false;
      return acc;
    }, {}),
  );
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnsMenuOpened, setColumnsMenuOpened] = useState(false);
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
      columnVisibility,
      ...(withPagination ? { pagination } : {}),
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    ...(withPagination ? { onPaginationChange: setPagination } : {}),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(withPagination
      ? { getPaginationRowModel: getPaginationRowModel() }
      : {}),
  });

  const rows = table.getRowModel().rows;

  let tbodyContent: ReactNode;
  if (isLoading) {
    tbodyContent = (
      <Table.Tr>
        <Table.Td colSpan={columns.length}>
          <Center py="xl">
            <Loader />
          </Center>
        </Table.Td>
      </Table.Tr>
    );
  } else if (rows.length === 0) {
    tbodyContent = (
      <Table.Tr>
        <Table.Td colSpan={columns.length}>
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
    .filter((column) => column.getCanHide());

  return (
    <Stack gap="sm">
      {(withGlobalFilter || withColumnVisibility) && (
        <Group justify="space-between" align="flex-start">
          {withGlobalFilter ? (
            <TextInput
              placeholder="Search..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.currentTarget.value)}
              style={{ flex: 1, maxWidth: 320 }}
            />
          ) : (
            <span />
          )}
          {withColumnVisibility && (
            <Popover
              opened={columnsMenuOpened}
              onChange={setColumnsMenuOpened}
              position="bottom-end"
              shadow="md"
              withinPortal
            >
              <Popover.Target>
                <Button
                  variant="default"
                  size="xs"
                  onClick={() => setColumnsMenuOpened((opened) => !opened)}
                >
                  Columns
                </Button>
              </Popover.Target>
              <Popover.Dropdown>
                <div style={{ maxHeight: 360, overflowY: "auto" }}>
                  <Stack gap="xs">
                    <Checkbox
                      size="xs"
                      label="Toggle all"
                      checked={table.getIsAllColumnsVisible()}
                      indeterminate={
                        table.getIsSomeColumnsVisible() &&
                        !table.getIsAllColumnsVisible()
                      }
                      onChange={table.getToggleAllColumnsVisibilityHandler()}
                    />
                    <Divider />
                    {hideableColumns.map((column) => (
                      <Checkbox
                        key={column.id}
                        size="xs"
                        label={columnLabel(column)}
                        checked={column.getIsVisible()}
                        onChange={column.getToggleVisibilityHandler()}
                      />
                    ))}
                  </Stack>
                </div>
              </Popover.Dropdown>
            </Popover>
          )}
        </Group>
      )}

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
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  const meta = columnsById.get(header.column.id);
                  return (
                    <Table.Th
                      key={header.id}
                      ta={meta?.align}
                      w={meta?.width}
                      onClick={
                        canSort
                          ? header.column.getToggleSortingHandler()
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
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {canSort && (
                            <Text size="xs" c="dimmed" component="span">
                              {getSortIcon(sorted)}
                            </Text>
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
