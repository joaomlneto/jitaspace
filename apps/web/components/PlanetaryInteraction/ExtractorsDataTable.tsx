"use client";

import { memo, useMemo } from "react";
import { Group, Progress, Text, Tooltip } from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";

import type { PiCatalog } from "./catalog";
import type { ExtractorRow } from "./colonies";
import { DataTable } from "~/components/DataTable";
import {
  CharacterCell,
  DimmedText,
  formatEveTime,
  formatNumber,
  PLANET_TYPE_OPTIONS,
  PlanetCell,
  planetTypeLabel,
  StatusBadge,
  TypeCell,
} from "./cells";
import {
  COLONY_STATUS_COLORS,
  COLONY_STATUS_LABELS,
  EXTRACTOR_STATUSES,
  formatRelative,
} from "./colonies";

const STATUS_OPTIONS = EXTRACTOR_STATUSES.map((status) => ({
  value: status,
  label: COLONY_STATUS_LABELS[status],
}));

const NO_ROWS: ExtractorRow[] = [];

export interface ExtractorsDataTableProps {
  rows?: ExtractorRow[];
  catalog: PiCatalog;
  showCharacter: boolean;
  now: number | null;
  isLoading?: boolean;
}

/** How far through its program an extractor is, as a labelled bar. */
export function ExtractorProgress({
  row,
  now,
}: Readonly<{ row: ExtractorRow; now: number | null }>) {
  if (row.expiryTime === undefined || now === null) {
    return <DimmedText>—</DimmedText>;
  }
  const remaining = formatRelative(row.expiryTime, now);
  const percent = Math.round((row.progress ?? 1) * 100);
  return (
    <Tooltip label={formatEveTime(row.expiryTime)}>
      <Group gap="xs" wrap="nowrap" miw={160}>
        <Progress
          value={percent}
          color={COLONY_STATUS_COLORS[row.status]}
          w={80}
          size="sm"
          aria-label={`Program ${percent}% complete, ends ${remaining}`}
        />
        <Text size="sm">{remaining}</Text>
      </Group>
    </Tooltip>
  );
}

export const ExtractorsDataTable = memo(
  ({
    rows,
    catalog,
    showCharacter,
    now,
    isLoading = false,
  }: ExtractorsDataTableProps) => {
    const columns = useMemo<DataTableColumn<ExtractorRow>[]>(
      () => [
        {
          id: "product",
          header: "Product",
          accessor: (row) =>
            row.productTypeId === undefined
              ? undefined
              : (catalog.types[row.productTypeId]?.name ?? row.productTypeId),
          sortable: true,
          filter: { type: "multi-select" },
          cell: (row) =>
            row.productTypeId === undefined ? (
              <DimmedText>No program</DimmedText>
            ) : (
              <TypeCell typeId={row.productTypeId} catalog={catalog} />
            ),
        },
        {
          id: "status",
          header: "Status",
          accessor: "status",
          sortable: true,
          filter: { type: "multi-select", options: STATUS_OPTIONS },
          cell: (row) => <StatusBadge status={row.status} />,
        },
        {
          id: "expiry",
          header: "Program ends",
          accessor: "expiryTime",
          sortable: true,
          cell: (row) => <ExtractorProgress row={row} now={now} />,
        },
        {
          id: "perHour",
          header: "Units / hour",
          accessor: "perHour",
          sortable: true,
          align: "right",
          cell: (row) => formatNumber(row.perHour),
        },
        {
          id: "heads",
          header: "Heads",
          accessor: "headCount",
          sortable: true,
          align: "right",
        },
        {
          id: "planet",
          header: "Planet",
          accessor: "planetId",
          sortable: true,
          cell: (row) => <PlanetCell planetId={row.planetId} />,
        },
        {
          id: "type",
          header: "Planet type",
          accessor: "planetType",
          sortable: true,
          defaultVisible: false,
          filter: { type: "multi-select", options: PLANET_TYPE_OPTIONS },
          cell: (row) => planetTypeLabel(row.planetType),
        },
        ...(showCharacter
          ? [
              {
                id: "character",
                header: "Character",
                accessor: "characterId",
                sortable: true,
                cell: (row) => <CharacterCell characterId={row.characterId} />,
              } satisfies DataTableColumn<ExtractorRow>,
            ]
          : []),
      ],
      [catalog, showCharacter, now],
    );

    return (
      <DataTable
        data={rows ?? NO_ROWS}
        columns={columns}
        rowId={(row) => row.key}
        isLoading={isLoading}
        emptyText="No extractors."
        withGlobalFilter
        withColumnVisibility
        withPagination
        defaultPageSize={25}
        initialSort={{ columnId: "expiry", direction: "asc" }}
        verticalSpacing="xs"
        highlightOnHover
        striped
      />
    );
  },
);
ExtractorsDataTable.displayName = "ExtractorsDataTable";
