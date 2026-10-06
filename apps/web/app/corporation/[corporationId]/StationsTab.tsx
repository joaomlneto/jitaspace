"use client";

import { Group } from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import {
  RegionAnchor,
  SolarSystemAnchor,
  StationAnchor,
  TypeAnchor,
  TypeName,
} from "@jitaspace/eve-components";
import { ISKAmount, SolarSystemSecurityStatusBadge } from "@jitaspace/ui";

import type { CorporationStation } from "./types";
import { DataTable } from "~/components/DataTable";
import { formatPercent } from "~/lib/format";

const columns: DataTableColumn<CorporationStation>[] = [
  {
    id: "station",
    header: "Station",
    accessor: "name",
    sortable: true,
    enableHiding: false,
    cell: (station) => (
      <StationAnchor stationId={station.stationId} prefetch={false}>
        {station.name}
      </StationAnchor>
    ),
  },
  {
    id: "system",
    header: "System",
    accessor: "solarSystemName",
    sortable: true,
    cell: (station) =>
      station.solarSystemId === null ? null : (
        <Group gap="xs" wrap="nowrap">
          {station.securityStatus !== null && (
            <SolarSystemSecurityStatusBadge
              securityStatus={station.securityStatus}
              size="sm"
            />
          )}
          <SolarSystemAnchor
            solarSystemId={station.solarSystemId}
            prefetch={false}
          >
            {station.solarSystemName ?? station.solarSystemId}
          </SolarSystemAnchor>
        </Group>
      ),
  },
  {
    id: "security",
    header: "Security",
    accessor: "securityStatus",
    sortable: true,
    align: "right",
    filter: { type: "range", min: -1, max: 1, step: 0.1 },
    defaultVisible: false,
    cell: (station) =>
      station.securityStatus === null
        ? null
        : station.securityStatus.toFixed(2),
  },
  {
    id: "region",
    header: "Region",
    accessor: "regionName",
    sortable: true,
    filter: { type: "select" },
    cell: (station) =>
      station.regionId === null ? null : (
        <RegionAnchor regionId={station.regionId} prefetch={false}>
          {station.regionName ?? station.regionId}
        </RegionAnchor>
      ),
  },
  {
    id: "type",
    header: "Station type",
    accessor: "typeId",
    defaultVisible: false,
    cell: (station) => (
      <TypeAnchor typeId={station.typeId} prefetch={false}>
        <TypeName span typeId={station.typeId} />
      </TypeAnchor>
    ),
  },
  {
    id: "reprocessing",
    header: "Reprocessing",
    accessor: "reprocessingEfficiency",
    sortable: true,
    align: "right",
    cell: (station) => formatPercent(station.reprocessingEfficiency),
  },
  {
    id: "officeRent",
    header: "Office rent",
    accessor: "officeRentalCost",
    sortable: true,
    align: "right",
    cell: (station) =>
      station.officeRentalCost === null ? null : (
        <ISKAmount amount={station.officeRentalCost} size="sm" />
      ),
  },
];

export function StationsTab({
  stations,
  isLoading,
}: Readonly<{ stations: CorporationStation[]; isLoading: boolean }>) {
  return (
    <DataTable
      data={stations}
      columns={columns}
      rowId={(station) => station.stationId}
      isLoading={isLoading}
      initialSort={{ columnId: "station", direction: "asc" }}
      withGlobalFilter
      withColumnVisibility
      withPagination
      defaultPageSize={50}
      verticalSpacing="xs"
      highlightOnHover
      striped
    />
  );
}
