"use client";

import { type ReactNode, useState } from "react";
import {
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
  Center,
  Group,
  Loader,
  Pagination,
  Select,
  Stack,
  Table,
  type TableProps,
  Text,
  TextInput,
} from "@mantine/core";

export type { ColumnDef, SortingState, VisibilityState };

export interface DataTableProps<TData> extends Omit<TableProps, "data"> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  isLoading?: boolean;
  emptyText?: string;
  withGlobalFilter?: boolean;
  withPagination?: boolean;
  defaultPageSize?: number;
  onRowClick?: (row: TData) => void;
  initialSorting?: SortingState;
  initialColumnVisibility?: VisibilityState;
}

const PAGE_SIZE_OPTIONS = ["10", "25", "50", "100"];

function getSortIcon(sorted: "asc" | "desc" | false): string {
  if (sorted === "asc") return "↑";
  if (sorted === "desc") return "↓";
  return "⇅";
}

export function DataTable<TData>({
  data,
  columns,
  isLoading = false,
  emptyText = "No data",
  withGlobalFilter = false,
  withPagination = false,
  defaultPageSize = 10,
  onRowClick,
  initialSorting,
  initialColumnVisibility,
  ...tableProps
}: Readonly<DataTableProps<TData>>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting ?? []);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    initialColumnVisibility ?? {},
  );
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });

  const table = useReactTable({
    data,
    columns,
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
    ...(withPagination ? { getPaginationRowModel: getPaginationRowModel() } : {}),
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
          <Table.Td key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </Table.Td>
        ))}
      </Table.Tr>
    ));
  }

  return (
    <Stack gap="sm">
      {withGlobalFilter && (
        <TextInput
          placeholder="Search..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.currentTarget.value)}
        />
      )}

      <Table.ScrollContainer minWidth={400}>
        <Table {...tableProps}>
          <Table.Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <Table.Th
                      key={header.id}
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
                        <Group gap={4} wrap="nowrap">
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
