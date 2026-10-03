"use client";

import type {
  DataTableSortStatus,
  DataTableColumn as MdtColumn,
} from "mantine-datatable";
import { useCallback, useMemo, useState } from "react";
import { Skeleton, Stack } from "@mantine/core";
import { DataTable as MantineDataTable } from "mantine-datatable";

import type { DataTableProps, DataTableSort } from "@jitaspace/datatable";
import type { ColumnFilterValue } from "@jitaspace/datatable-common";
import {
  ColumnFilterControl,
  DataTableToolbar,
  matchesColumnFilter,
  primitiveString,
  readColumnValue,
  readFilterValue,
  rowMatchesGlobalFilter,
  sortRows,
} from "@jitaspace/datatable-common";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/** Skeleton rows rendered while loading without pagination. */
const UNPAGINATED_SKELETON_ROWS = 10;

/** A placeholder record for one skeleton row. */
interface SkeletonRecord {
  key: number;
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
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<
    Record<string, ColumnFilterValue>
  >({});
  const [sort, setSort] = useState<DataTableSort | undefined>(initialSort);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(
    () =>
      new Set(
        columns.filter((c) => c.defaultVisible === false).map((c) => c.id),
      ),
  );

  const setColumnFilter = useCallback(
    (id: string, value: ColumnFilterValue | undefined) => {
      setColumnFilters((prev) => {
        const { [id]: _previous, ...rest } = prev;
        return value === undefined ? rest : { ...rest, [id]: value };
      });
      setPage(1);
    },
    [],
  );

  // 1. column filters, then the global search (across all accessor columns)
  const filtered = useMemo(() => {
    const active = columns.flatMap((col) => {
      const value = columnFilters[col.id];
      return col.filter && value !== undefined
        ? [{ col, filter: col.filter, value }]
        : [];
    });
    if (active.length === 0 && globalFilter.trim() === "") return data;
    return data.filter(
      (row) =>
        active.every(({ col, filter, value }) =>
          matchesColumnFilter(filter, readFilterValue(col, row), value),
        ) &&
        (!withGlobalFilter ||
          rowMatchesGlobalFilter(columns, row, globalFilter)),
    );
  }, [data, columns, columnFilters, withGlobalFilter, globalFilter]);

  // 2. sort (only by a sortable column, as TanStack does with `initialSort`)
  const sorted = useMemo(() => {
    const col = sort && columns.find((c) => c.id === sort.columnId);
    return sort && col?.sortable
      ? sortRows(filtered, col, sort.direction)
      : filtered;
  }, [filtered, sort, columns]);

  // 3. paginate (client-side slice; mantine-datatable renders the controls)
  const totalRecords = sorted.length;
  // Data shrinking under the current page (a refetch, a wallet deselected)
  // would leave it past the end, showing "No data" while rows exist. Step back
  // to the last page — during render, so the empty page is never painted.
  const lastPage = Math.max(Math.ceil(totalRecords / pageSize), 1);
  if (withPagination && page > lastPage) setPage(lastPage);
  const pageRecords = useMemo(() => {
    if (!withPagination) return sorted;
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, withPagination, page, pageSize]);

  // Stable row keys: mantine-datatable requires an id per record.
  const keyByRecord = useMemo(() => {
    const map = new Map<TData, string>();
    data.forEach((row, index) =>
      map.set(row, rowId ? String(rowId(row)) : String(index)),
    );
    return map;
  }, [data, rowId]);

  const visibleColumns = useMemo(
    () => columns.filter((col) => !hiddenIds.has(col.id)),
    [columns, hiddenIds],
  );

  const mdtColumns = useMemo<MdtColumn<TData>[]>(
    () =>
      visibleColumns.map((col) => {
        const filterValue = columnFilters[col.id];
        return {
          accessor: col.id,
          title: col.header,
          sortable: col.sortable ?? false,
          textAlign: col.align,
          width: col.width,
          render: (record: TData) => {
            const value = readColumnValue(col, record);
            return col.cell ? col.cell(record, value) : primitiveString(value);
          },
          ...(col.filter
            ? {
                filter: (
                  <ColumnFilterControl
                    column={col}
                    rows={data}
                    value={filterValue}
                    onChange={(value) => setColumnFilter(col.id, value)}
                  />
                ),
                filtering: filterValue !== undefined,
              }
            : {}),
        };
      }),
    [visibleColumns, columnFilters, data, setColumnFilter],
  );

  // Only a sortable column shows the sort arrow: an `initialSort` naming
  // another one is ignored (as TanStack does), so it must not look applied.
  const sortedColumn =
    sort && columns.find((col) => col.id === sort.columnId)?.sortable
      ? sort.columnId
      : "";
  const sortStatus: DataTableSortStatus<TData> = {
    columnAccessor: sortedColumn,
    direction: sort?.direction ?? "asc",
  };

  const handleSortStatusChange = (status: DataTableSortStatus<TData>) => {
    const columnId = String(status.columnAccessor);
    setSort({
      columnId,
      // mantine-datatable carries the previous column's direction over to a
      // newly clicked one; the contract (and TanStack) starts it ascending.
      direction: columnId === sortedColumn ? status.direction : "asc",
    });
    setPage(1);
  };

  const hideableColumns = columns
    .filter((col) => col.enableHiding !== false)
    .map((col) => ({
      id: col.id,
      label: col.header,
      visible: !hiddenIds.has(col.id),
    }));

  const toggleColumn = (id: string) =>
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAllColumns = () =>
    setHiddenIds(() =>
      hideableColumns.every((col) => col.visible)
        ? new Set(hideableColumns.map((col) => col.id))
        : new Set(),
    );

  const paginationFor = (total: number) => ({
    page,
    onPageChange: setPage,
    totalRecords: total,
    recordsPerPage: pageSize,
    // The standard sizes, plus the table's own default if it is not one.
    recordsPerPageOptions: [
      ...new Set([...PAGE_SIZE_OPTIONS, defaultPageSize]),
    ].sort((a, b) => a - b),
    // Keep the first row in view, as TanStack does: page 3 of 25 rows (rows
    // 51-75) becomes page 6 of 10 (rows 51-60).
    onRecordsPerPageChange: (size: number) => {
      setPage(Math.floor(((page - 1) * pageSize) / size) + 1);
      setPageSize(size);
    },
  });

  const skeletonRecords: SkeletonRecord[] = Array.from(
    { length: withPagination ? pageSize : UNPAGINATED_SKELETON_ROWS },
    (_, key) => ({ key }),
  );
  const paginationProps = withPagination ? paginationFor(totalRecords) : {};
  // The footer is rendered while loading too, or it would appear with the
  // data and shift the page after all.
  const skeletonPaginationProps = withPagination
    ? {
        ...paginationFor(skeletonRecords.length),
        // One page of placeholders: show it as the current one, whatever page
        // the real data was on, and leave that page alone.
        page: 1,
        onPageChange: () => {
          /* nothing to page through while loading */
        },
        paginationText: () => "Loading…",
      }
    : {};

  const rowClickProps = onRowClick
    ? {
        onRowClick: ({ record }: { record: TData }) => onRowClick(record),
      }
    : {};

  const presentation = {
    striped,
    highlightOnHover,
    // mantine-datatable types this as a required boolean once it is passed.
    withTableBorder: withTableBorder ?? false,
    withColumnBorders,
    verticalSpacing,
    fz: fontSize,
    minHeight: 160,
  };

  return (
    <Stack gap="sm">
      <DataTableToolbar
        withGlobalFilter={withGlobalFilter}
        globalFilter={globalFilter}
        onGlobalFilterChange={(value) => {
          setGlobalFilter(value);
          setPage(1);
        }}
        withColumnVisibility={withColumnVisibility}
        hideableColumns={hideableColumns}
        onToggleColumn={toggleColumn}
        onToggleAllColumns={toggleAllColumns}
        activeFilterCount={Object.keys(columnFilters).length}
        onClearFilters={() => {
          setColumnFilters({});
          setPage(1);
        }}
      />

      {isLoading ? (
        // A full page of placeholders, so the table is at its loaded height
        // from the first paint and the rows arriving do not shift the page.
        <MantineDataTable<SkeletonRecord>
          records={skeletonRecords}
          columns={visibleColumns.map((col) => ({
            accessor: col.id,
            title: col.header,
            textAlign: col.align,
            width: col.width,
            render: () => <Skeleton height={20} />,
          }))}
          idAccessor="key"
          {...presentation}
          {...skeletonPaginationProps}
        />
      ) : (
        <MantineDataTable<TData>
          records={pageRecords}
          columns={mdtColumns}
          idAccessor={(record: TData) => keyByRecord.get(record) ?? ""}
          noRecordsText={emptyText}
          sortStatus={sortStatus}
          onSortStatusChange={handleSortStatusChange}
          {...presentation}
          {...rowClickProps}
          {...paginationProps}
        />
      )}
    </Stack>
  );
}
