"use client";

import { useMemo } from "react";

import type { DataTableColumn } from "@jitaspace/datatable";

import type { SystemsById, UniverseSystem } from "./types";
import { ConstellationAnchor } from "~/components/Anchor";
import { DataTable } from "~/components/DataTable";
import { bandOf, SystemLink } from "./parts";

const SITE_LABEL = {
  staging: "Staging",
  vanguard: "Vanguard",
  assault: "Assault",
  headquarters: "Headquarters",
} as const;

interface SystemRow extends UniverseSystem {
  band: string;
  site: string | null;
  constellationName: string;
}

const columnsFor = (
  systemsById: SystemsById,
  withConstellation: boolean,
): DataTableColumn<SystemRow>[] => [
  {
    id: "name",
    header: "System",
    accessor: "name",
    sortable: true,
    filter: { type: "text" },
    cell: (row) => (
      <SystemLink solarSystemId={row.solarSystemId} systems={systemsById} />
    ),
  },
  ...(withConstellation
    ? [
        {
          id: "constellation",
          header: "Constellation",
          accessor: "constellationName",
          sortable: true,
          filter: { type: "multi-select" },
          cell: (row) => (
            <ConstellationAnchor constellationId={row.constellationId}>
              {row.constellationName}
            </ConstellationAnchor>
          ),
        } satisfies DataTableColumn<SystemRow>,
      ]
    : []),
  {
    id: "securityStatus",
    header: "Security",
    accessor: "securityStatus",
    sortable: true,
    align: "right",
    filter: { type: "range", min: -1, max: 1, step: 0.1 },
    cell: (row) => row.securityStatus.toFixed(2),
  },
  {
    id: "band",
    header: "Band",
    accessor: "band",
    sortable: true,
    filter: { type: "multi-select" },
  },
  {
    id: "stationCount",
    header: "Stations",
    accessor: "stationCount",
    sortable: true,
    align: "right",
    filter: { type: "range", min: 0 },
  },
  {
    id: "site",
    header: "Incursion site",
    accessor: "site",
    sortable: true,
    filter: { type: "multi-select" },
  },
];

/**
 * Systems as a table: security, band, stations and incursion site. `staging`
 * holds the staging systems the latest incursions used. A region's table adds
 * a Constellation column when given `constellationNames`.
 */
export function SystemsTable({
  systems,
  systemsById,
  staging,
  isWormhole,
  constellationNames,
}: Readonly<{
  systems: readonly UniverseSystem[];
  systemsById: SystemsById;
  staging: ReadonlySet<number>;
  isWormhole: boolean;
  constellationNames?: ReadonlyMap<number, string>;
}>) {
  const rows = useMemo<SystemRow[]>(
    () =>
      systems.map((system) => {
        const role = staging.has(system.solarSystemId)
          ? "staging"
          : system.siteRole;
        return {
          ...system,
          band: bandOf(system.securityStatus, isWormhole),
          site: role ? SITE_LABEL[role] : null,
          constellationName:
            constellationNames?.get(system.constellationId) ??
            String(system.constellationId),
        };
      }),
    [systems, staging, isWormhole, constellationNames],
  );
  const columns = useMemo(
    () => columnsFor(systemsById, constellationNames !== undefined),
    [systemsById, constellationNames],
  );
  return (
    <DataTable
      data={rows}
      columns={columns}
      rowId={(row) => row.solarSystemId}
      withGlobalFilter
      withColumnVisibility
      withPagination
      defaultPageSize={50}
      initialSort={{ columnId: "name", direction: "asc" }}
      verticalSpacing="xs"
      withTableBorder
      highlightOnHover
      striped
    />
  );
}
