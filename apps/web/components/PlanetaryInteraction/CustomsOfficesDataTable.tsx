"use client";

import { memo, useMemo } from "react";

import type { DataTableColumn } from "@jitaspace/datatable";

import type { CustomsOfficeRow, StandingLevel } from "./customsOffices";
import { DataTable } from "~/components/DataTable";
import { CorporationCell, formatPercent, SolarSystemCell } from "./cells";
import {
  accessSummary,
  reinforceWindow,
  STANDING_LEVEL_LABELS,
  STANDING_LEVELS,
  standingTaxRate,
} from "./customsOffices";

const NO_ROWS: CustomsOfficeRow[] = [];

const STANDING_OPTIONS = STANDING_LEVELS.map((level) => ({
  value: level,
  label: STANDING_LEVEL_LABELS[level],
}));

const standingTaxColumn = (
  level: StandingLevel,
): DataTableColumn<CustomsOfficeRow> => ({
  id: `${level}Tax`,
  header: `${STANDING_LEVEL_LABELS[level]} standing tax`,
  accessor: (row) => standingTaxRate(row, level),
  sortable: true,
  align: "right",
  defaultVisible: false,
  cell: (row) => formatPercent(standingTaxRate(row, level)),
});

export const CustomsOfficesDataTable = memo(
  ({
    rows,
    showCorporation,
    isLoading = false,
    emptyText,
  }: Readonly<{
    rows?: CustomsOfficeRow[];
    showCorporation: boolean;
    isLoading?: boolean;
    emptyText?: string;
  }>) => {
    const columns = useMemo<DataTableColumn<CustomsOfficeRow>[]>(
      () => [
        ...(showCorporation
          ? [
              {
                id: "corporation",
                header: "Corporation",
                accessor: "subjectId",
                sortable: true,
                cell: (row) => (
                  <CorporationCell corporationId={row.subjectId} />
                ),
              } satisfies DataTableColumn<CustomsOfficeRow>,
            ]
          : []),
        {
          id: "system",
          header: "System",
          accessor: "system_id",
          sortable: true,
          cell: (row) => <SolarSystemCell solarSystemId={row.system_id} />,
        },
        {
          id: "corporationTax",
          header: "Corporation tax",
          accessor: "corporation_tax_rate",
          sortable: true,
          align: "right",
          filter: { type: "range", min: 0, max: 1, step: 0.01 },
          cell: (row) => formatPercent(row.corporation_tax_rate),
        },
        {
          id: "allianceTax",
          header: "Alliance tax",
          accessor: (row) =>
            row.allow_alliance_access ? row.alliance_tax_rate : undefined,
          sortable: true,
          align: "right",
          cell: (row) =>
            row.allow_alliance_access
              ? formatPercent(row.alliance_tax_rate)
              : "No access",
        },
        {
          id: "allianceAccess",
          header: "Alliance access",
          accessor: "allow_alliance_access",
          sortable: true,
          defaultVisible: false,
          filter: { type: "boolean" },
          cell: (row) => (row.allow_alliance_access ? "Yes" : "No"),
        },
        {
          id: "standingLevel",
          header: "Minimum standing",
          accessor: (row) =>
            row.allow_access_with_standings ? row.standing_level : undefined,
          sortable: true,
          sortAccessor: (row) =>
            row.allow_access_with_standings && row.standing_level
              ? STANDING_LEVELS.indexOf(row.standing_level)
              : null,
          filter: { type: "multi-select", options: STANDING_OPTIONS },
          cell: (row) =>
            row.allow_access_with_standings && row.standing_level
              ? STANDING_LEVEL_LABELS[row.standing_level]
              : "No access",
        },
        ...[...STANDING_LEVELS].reverse().map(standingTaxColumn),
        {
          id: "access",
          header: "Who may use it",
          accessor: accessSummary,
          defaultVisible: false,
        },
        {
          id: "reinforce",
          header: "Reinforcement exit (UTC)",
          accessor: "reinforce_exit_start",
          sortable: true,
          cell: reinforceWindow,
        },
        {
          id: "officeId",
          header: "Office ID",
          accessor: "office_id",
          sortable: true,
          defaultVisible: false,
        },
      ],
      [showCorporation],
    );

    return (
      <DataTable
        data={rows ?? NO_ROWS}
        columns={columns}
        rowId={(row) => row.office_id}
        isLoading={isLoading}
        emptyText={emptyText ?? "No customs offices."}
        withGlobalFilter
        withColumnVisibility
        withPagination
        defaultPageSize={25}
        initialSort={{ columnId: "system", direction: "asc" }}
        verticalSpacing="xs"
        highlightOnHover
        striped
      />
    );
  },
);
CustomsOfficesDataTable.displayName = "CustomsOfficesDataTable";
