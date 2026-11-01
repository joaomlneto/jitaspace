"use client";

import { memo, useMemo } from "react";
import { Button, Group, Skeleton, Text, Tooltip } from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";

import type { ColonyRow } from "./colonies";
import { DataTable } from "~/components/DataTable";
import {
  CharacterCell,
  DimmedText,
  formatEveTime,
  PLANET_TYPE_OPTIONS,
  PlanetCell,
  planetTypeLabel,
  SolarSystemCell,
  StatusBadge,
} from "./cells";
import {
  COLONY_STATUS_LABELS,
  COLONY_STATUSES,
  compareColonyStatus,
  formatRelative,
} from "./colonies";

const STATUS_OPTIONS = COLONY_STATUSES.map((status) => ({
  value: status,
  label: COLONY_STATUS_LABELS[status],
}));

const NO_ROWS: ColonyRow[] = [];

export interface ColoniesDataTableProps {
  rows?: ColonyRow[];
  /** Show who owns each colony; pointless with a single character. */
  showCharacter: boolean;
  now: number | null;
  isLoading?: boolean;
  emptyText?: string;
  onShowDetails: (row: ColonyRow) => void;
}

function LayoutPending({ row }: Readonly<{ row: ColonyRow }>) {
  return row.layoutState === "error" ? (
    <DimmedText>Unavailable</DimmedText>
  ) : (
    <Skeleton h={18} w={70} aria-label="Loading" />
  );
}

export const ColoniesDataTable = memo(
  ({
    rows,
    showCharacter,
    now,
    isLoading = false,
    emptyText,
    onShowDetails,
  }: ColoniesDataTableProps) => {
    const columns = useMemo<DataTableColumn<ColonyRow>[]>(
      () => [
        ...(showCharacter
          ? [
              {
                id: "character",
                header: "Character",
                accessor: "subjectId",
                sortable: true,
                cell: (row) => <CharacterCell characterId={row.subjectId} />,
              } satisfies DataTableColumn<ColonyRow>,
            ]
          : []),
        {
          id: "planet",
          header: "Planet",
          accessor: "planet_id",
          sortable: true,
          cell: (row) => <PlanetCell planetId={row.planet_id} />,
        },
        {
          id: "type",
          header: "Type",
          accessor: "planet_type",
          sortable: true,
          filter: { type: "multi-select", options: PLANET_TYPE_OPTIONS },
          cell: (row) => planetTypeLabel(row.planet_type),
        },
        {
          id: "system",
          header: "System",
          accessor: "solar_system_id",
          sortable: true,
          cell: (row) => (
            <SolarSystemCell solarSystemId={row.solar_system_id} />
          ),
        },
        {
          id: "status",
          header: "Status",
          accessor: (row) => row.summary?.status,
          sortable: true,
          // Most urgent first when sorted ascending.
          sortAccessor: (row) =>
            row.summary
              ? compareColonyStatus(row.summary.status, "expired")
              : null,
          filter: { type: "multi-select", options: STATUS_OPTIONS },
          cell: (row) =>
            row.summary ? (
              <StatusBadge status={row.summary.status} />
            ) : (
              <LayoutPending row={row} />
            ),
        },
        {
          id: "nextExpiry",
          header: "Next expiry",
          accessor: (row) => row.summary?.nextExpiry,
          sortable: true,
          cell: (row) => {
            const expiry = row.summary?.nextExpiry;
            if (!row.summary) return <LayoutPending row={row} />;
            if (expiry === undefined || now === null)
              return <DimmedText>—</DimmedText>;
            return (
              <Tooltip label={formatEveTime(expiry)}>
                <Text size="sm">{formatRelative(expiry, now)}</Text>
              </Tooltip>
            );
          },
        },
        {
          id: "extractors",
          header: "Extractors",
          accessor: (row) => row.summary?.extractors.length,
          sortable: true,
          align: "right",
        },
        {
          id: "factories",
          header: "Factories",
          accessor: (row) => row.summary?.factories.length,
          sortable: true,
          align: "right",
          defaultVisible: false,
        },
        {
          id: "level",
          header: "Upgrade level",
          accessor: "upgrade_level",
          sortable: true,
          align: "right",
          filter: { type: "range", min: 0, max: 5, step: 1 },
        },
        {
          id: "pins",
          header: "Pins",
          accessor: "num_pins",
          sortable: true,
          align: "right",
        },
        {
          id: "lastUpdate",
          header: "Last update",
          accessor: (row) => Date.parse(row.last_update),
          sortable: true,
          defaultVisible: false,
          cell: (row) =>
            now === null ? (
              formatEveTime(Date.parse(row.last_update))
            ) : (
              <Tooltip label={formatEveTime(Date.parse(row.last_update))}>
                <Text size="sm">
                  {formatRelative(Date.parse(row.last_update), now)}
                </Text>
              </Tooltip>
            ),
        },
        {
          id: "details",
          header: "Details",
          enableHiding: false,
          cell: (row) => (
            <Group justify="flex-end">
              <Button
                size="compact-xs"
                variant="light"
                disabled={!row.summary}
                onClick={() => {
                  onShowDetails(row);
                }}
              >
                View
              </Button>
            </Group>
          ),
        },
      ],
      [showCharacter, now, onShowDetails],
    );

    return (
      <DataTable
        data={rows ?? NO_ROWS}
        columns={columns}
        rowId={(row) => row.key}
        isLoading={isLoading}
        emptyText={emptyText ?? "No colonies."}
        withGlobalFilter
        withColumnVisibility
        withPagination
        defaultPageSize={25}
        initialSort={{ columnId: "status", direction: "asc" }}
        verticalSpacing="xs"
        highlightOnHover
        striped
      />
    );
  },
);
ColoniesDataTable.displayName = "ColoniesDataTable";
