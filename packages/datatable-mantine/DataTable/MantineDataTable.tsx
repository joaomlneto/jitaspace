"use client";

import { type ReactNode, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Divider,
  Group,
  Popover,
  Stack,
  TextInput,
} from "@mantine/core";
import {
  DataTable as MantineDataTable,
  type DataTableColumn as MdtColumn,
  type DataTableSortStatus,
} from "mantine-datatable";

import type {
  DataTableColumn,
  DataTableProps,
  DataTableSort,
} from "@jitaspace/datatable";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type SortValue = string | number | null | undefined;

/** Stringify only primitives; anything else becomes "" (avoids "[object Object]"). */
function primitiveString(value: unknown): string {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  return "";
}

function renderValue(value: unknown): ReactNode {
  return primitiveString(value);
}

function readValue<TData>(col: DataTableColumn<TData>, row: TData): unknown {
  if (typeof col.accessor === "function") return col.accessor(row);
  if (col.accessor != null) return row[col.accessor];
  return undefined;
}

function sortKey<TData>(col: DataTableColumn<TData>, row: TData): SortValue {
  if (col.sortAccessor) return col.sortAccessor(row);
  const value = readValue(col, row);
  if (typeof value === "number" || typeof value === "string") return value;
  return value == null ? value : primitiveString(value);
}

function compareValues(a: SortValue, b: SortValue): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
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
  fontSize,
}: Readonly<DataTableProps<TData>>) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [sort, setSort] = useState<DataTableSort | undefined>(initialSort);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(
    () => new Set(columns.filter((c) => c.defaultVisible === false).map((c) => c.id)),
  );
  const [columnsMenuOpened, setColumnsMenuOpened] = useState(false);

  // 1. global filter (across all accessor columns)
  const filtered = useMemo(() => {
    if (!withGlobalFilter || globalFilter.trim() === "") return data;
    const query = globalFilter.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const value = readValue(col, row);
        return primitiveString(value).toLowerCase().includes(query);
      }),
    );
  }, [data, columns, withGlobalFilter, globalFilter]);

  // 2. sort
  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.id === sort.columnId);
    if (!col) return filtered;
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort(
      (a, b) => direction * compareValues(sortKey(col, a), sortKey(col, b)),
    );
  }, [filtered, sort, columns]);

  // 3. paginate (client-side slice; mantine-datatable renders the controls)
  const totalRecords = sorted.length;
  const pageRecords = useMemo(() => {
    if (!withPagination) return sorted;
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, withPagination, page, pageSize]);

  // Stable row keys: mantine-datatable requires an id per record.
  const keyByRecord = useMemo(() => {
    const map = new Map<TData, string>();
    sorted.forEach((row, index) =>
      map.set(row, rowId ? String(rowId(row)) : String(index)),
    );
    return map;
  }, [sorted, rowId]);

  const mdtColumns = useMemo<MdtColumn<TData>[]>(
    () =>
      columns
        .filter((col) => !hiddenIds.has(col.id))
        .map((col) => ({
          accessor: col.id,
          title: col.header,
          sortable: col.sortable ?? false,
          textAlign: col.align,
          width: col.width,
          render: (record: TData) =>
            col.cell
              ? col.cell(record, readValue(col, record))
              : renderValue(readValue(col, record)),
        })),
    [columns, hiddenIds],
  );

  const sortStatus: DataTableSortStatus<TData> = {
    columnAccessor: sort?.columnId ?? "",
    direction: sort?.direction ?? "asc",
  };

  const handleSortStatusChange = (status: DataTableSortStatus<TData>) => {
    setSort({
      columnId: String(status.columnAccessor),
      direction: status.direction,
    });
    setPage(1);
  };

  const hideableColumns = columns.filter((col) => col.enableHiding !== false);
  const allVisible = hideableColumns.every((col) => !hiddenIds.has(col.id));
  const someVisible = hideableColumns.some((col) => !hiddenIds.has(col.id));

  const toggleColumn = (id: string) =>
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setHiddenIds(() =>
      allVisible ? new Set(hideableColumns.map((col) => col.id)) : new Set(),
    );

  const paginationProps = withPagination
    ? {
        page,
        onPageChange: setPage,
        totalRecords,
        recordsPerPage: pageSize,
        recordsPerPageOptions: PAGE_SIZE_OPTIONS,
        onRecordsPerPageChange: (size: number) => {
          setPageSize(size);
          setPage(1);
        },
      }
    : {};

  return (
    <Stack gap="sm">
      {(withGlobalFilter || withColumnVisibility) && (
        <Group justify="space-between" align="flex-start">
          {withGlobalFilter ? (
            <TextInput
              placeholder="Search..."
              value={globalFilter}
              onChange={(e) => {
                setGlobalFilter(e.currentTarget.value);
                setPage(1);
              }}
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
                      checked={allVisible}
                      indeterminate={someVisible && !allVisible}
                      onChange={toggleAll}
                    />
                    <Divider />
                    {hideableColumns.map((col) => (
                      <Checkbox
                        key={col.id}
                        size="xs"
                        label={col.header}
                        checked={!hiddenIds.has(col.id)}
                        onChange={() => toggleColumn(col.id)}
                      />
                    ))}
                  </Stack>
                </div>
              </Popover.Dropdown>
            </Popover>
          )}
        </Group>
      )}

      <MantineDataTable<TData>
        records={pageRecords}
        columns={mdtColumns}
        idAccessor={(record: TData) => keyByRecord.get(record) ?? ""}
        fetching={isLoading}
        noRecordsText={emptyText}
        sortStatus={sortStatus}
        onSortStatusChange={handleSortStatusChange}
        striped={striped}
        highlightOnHover={highlightOnHover}
        withTableBorder={withTableBorder}
        withColumnBorders={withColumnBorders}
        fz={fontSize}
        minHeight={160}
        {...(onRowClick
          ? { onRowClick: ({ record }: { record: TData }) => onRowClick(record) }
          : {})}
        {...paginationProps}
      />
    </Stack>
  );
}
