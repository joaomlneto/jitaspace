"use client";

import { useMemo } from "react";
import { Alert, Stack, Text } from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import { securityStatusBand } from "@jitaspace/ui";

import type { Names } from "./parts";
import type { IncursionLayout } from "./types";
import { DataTable } from "~/components/DataTable";
import { useIncursionLayouts } from "./history";
import {
  constellationColumnsFor,
  EveTime,
  SystemLink,
  useNames,
} from "./parts";

interface LayoutRow extends IncursionLayout {
  constellationName: string;
  regionName: string | null;
  security: string | null;
  stagingName: string | null;
  isMapped: boolean;
  siteCount: number;
  vanguardCount: number;
  assaultCount: number;
  vanguardNames: string;
  assaultNames: string;
  headquartersNames: string;
}

/** A constellation's systems of one site type, one per line. */
function SiteSystems({
  solarSystemIds,
  names,
}: Readonly<{ solarSystemIds: readonly number[]; names: Names }>) {
  return (
    <Stack gap={4}>
      {solarSystemIds.map((solarSystemId) => (
        <SystemLink
          key={solarSystemId}
          solarSystemId={solarSystemId}
          names={names}
        />
      ))}
    </Stack>
  );
}

const Dash = () => (
  <Text span size="sm" c="dimmed">
    —
  </Text>
);

const siteColumn = (
  role: "vanguard" | "assault" | "headquarters",
  header: string,
  names: Names,
): DataTableColumn<LayoutRow> => ({
  id: role,
  header,
  accessor: `${role}Names`,
  filter: { type: "text" },
  cell: (row) => {
    if (row[role].length > 0) {
      return <SiteSystems solarSystemIds={row[role]} names={names} />;
    }
    return role === "vanguard" && !row.isMapped ? (
      <Text span size="sm" c="dimmed">
        Not mapped
      </Text>
    ) : (
      <Dash />
    );
  },
});

const layoutColumnsFor = (names: Names): DataTableColumn<LayoutRow>[] => [
  ...constellationColumnsFor<LayoutRow>(names),
  {
    id: "security",
    header: "Security",
    accessor: "security",
    sortable: true,
    filter: { type: "multi-select" },
  },
  {
    id: "staging",
    header: "Staging",
    accessor: "stagingName",
    sortable: true,
    filter: { type: "text" },
    cell: (row) =>
      row.stagingSolarSystemId === null ? (
        <Dash />
      ) : (
        <SystemLink solarSystemId={row.stagingSolarSystemId} names={names} />
      ),
  },
  siteColumn("vanguard", "Vanguard", names),
  siteColumn("assault", "Assault", names),
  siteColumn("headquarters", "Headquarters", names),
  {
    id: "siteCount",
    header: "Sites",
    accessor: "siteCount",
    sortable: true,
    align: "right",
    filter: { type: "range", min: 0 },
  },
  {
    id: "vanguardCount",
    header: "Vanguard sites",
    accessor: "vanguardCount",
    sortable: true,
    align: "right",
    filter: { type: "range", min: 0 },
    defaultVisible: false,
  },
  {
    id: "assaultCount",
    header: "Assault sites",
    accessor: "assaultCount",
    sortable: true,
    align: "right",
    filter: { type: "range", min: 0 },
    defaultVisible: false,
  },
  {
    id: "incursionCount",
    header: "Incursions",
    accessor: "incursionCount",
    sortable: true,
    align: "right",
    filter: { type: "range", min: 0 },
  },
  {
    id: "latestIncursionAt",
    header: "Latest incursion (EVE)",
    accessor: "latestIncursionAt",
    sortable: true,
    filter: { type: "date-range" },
    cell: (row) =>
      row.latestIncursionAt ? <EveTime iso={row.latestIncursionAt} /> : null,
  },
];

/** Where each site type spawns, constellation by constellation. */
export function LayoutsTab() {
  const layouts = useIncursionLayouts();
  const names = useNames(
    useMemo(
      () =>
        layouts.data ?? {
          constellations: {},
          regions: {},
          factions: {},
          alliances: {},
          solarSystems: {},
        },
      [layouts.data],
    ),
  );
  const rows = useMemo<LayoutRow[]>(
    () =>
      (layouts.data?.layouts ?? []).map((layout) => {
        const staging =
          layout.stagingSolarSystemId === null
            ? undefined
            : names.system(layout.stagingSolarSystemId);
        const systemNames = (ids: readonly number[]) =>
          ids.map((id) => names.system(id)?.name ?? String(id)).join(", ");
        return {
          ...layout,
          constellationName: names.constellation(layout.constellationId),
          regionName: names.region(layout.constellationId)?.name ?? null,
          security: staging ? securityStatusBand(staging.securityStatus) : null,
          stagingName: staging?.name ?? null,
          isMapped: layout.headquarters.length > 0,
          siteCount:
            layout.vanguard.length +
            layout.assault.length +
            layout.headquarters.length,
          vanguardCount: layout.vanguard.length,
          assaultCount: layout.assault.length,
          vanguardNames: systemNames(layout.vanguard),
          assaultNames: systemNames(layout.assault),
          headquartersNames: systemNames(layout.headquarters),
        };
      }),
    [layouts.data, names],
  );
  const columns = useMemo(() => layoutColumnsFor(names), [names]);

  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        Which systems host the vanguard, assault and headquarters sites when an
        incursion spawns in each constellation. CCP does not publish this. Most
        layouts come from eve-incursions.de and the EVE University wiki; the
        rest follow the rule every known layout does (vanguards nearest the
        staging system, the headquarters furthest), and killmails have settled
        the few the sources disagreed on. The staging system shown is the one
        the latest incursion used.
      </Text>
      {layouts.isError ? (
        <Alert color="red" variant="light">
          The layouts could not be loaded. Try again in a moment.
        </Alert>
      ) : (
        <DataTable
          data={rows}
          isLoading={layouts.isPending}
          columns={columns}
          rowId={(row) => row.constellationId}
          withGlobalFilter
          withColumnVisibility
          withPagination
          defaultPageSize={25}
          initialSort={{ columnId: "incursionCount", direction: "desc" }}
          verticalSpacing="xs"
          withTableBorder
          highlightOnHover
          striped
        />
      )}
    </Stack>
  );
}
