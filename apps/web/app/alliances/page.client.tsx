"use client";

import { useMemo } from "react";
import { Container, Group, Stack, Text, Title } from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import { AlliancesIcon } from "@jitaspace/eve-icons";
import {
  AllianceAnchor,
  AllianceAvatar,
  CorporationAnchor,
} from "@jitaspace/ui";

import { DataTable } from "~/components/DataTable";
import { formatInteger } from "~/lib/format";

export interface AllianceRow {
  allianceId: number;
  name: string;
  ticker: string;
  /** ISO timestamp. */
  dateFounded: string;
  executorCorporationId: number | null;
  executorName: string | null;
  factionName: string | null;
  corporations: number;
  pilots: number;
  /** Solar systems the alliance holds sovereignty over. */
  sovSystems: number;
}

export interface PageProps {
  alliances: AllianceRow[];
}

function nameCell(alliance: AllianceRow) {
  return (
    <Group gap="xs" wrap="nowrap">
      <AllianceAvatar allianceId={alliance.allianceId} size="sm" />
      <AllianceAnchor allianceId={alliance.allianceId}>
        {alliance.name}
      </AllianceAnchor>
    </Group>
  );
}

function executorCell(alliance: AllianceRow) {
  if (alliance.executorCorporationId === null) return null;
  return (
    <CorporationAnchor corporationId={alliance.executorCorporationId}>
      {alliance.executorName ?? alliance.executorCorporationId}
    </CorporationAnchor>
  );
}

const columns: DataTableColumn<AllianceRow>[] = [
  {
    id: "name",
    header: "Alliance",
    accessor: "name",
    sortable: true,
    cell: nameCell,
    enableHiding: false,
  },
  {
    id: "ticker",
    header: "Ticker",
    accessor: "ticker",
    sortable: true,
    cell: (alliance) => `<${alliance.ticker}>`,
  },
  {
    id: "pilots",
    header: "Pilots",
    accessor: "pilots",
    sortable: true,
    filter: { type: "range", min: 0 },
    align: "right",
    cell: (alliance) => formatInteger(alliance.pilots),
  },
  {
    id: "corporations",
    header: "Corporations",
    accessor: "corporations",
    sortable: true,
    filter: { type: "range", min: 0 },
    align: "right",
    cell: (alliance) => formatInteger(alliance.corporations),
  },
  {
    id: "sovSystems",
    header: "Sov systems",
    accessor: "sovSystems",
    sortable: true,
    filter: { type: "range", min: 0 },
    align: "right",
    cell: (alliance) => formatInteger(alliance.sovSystems),
  },
  {
    id: "executor",
    header: "Executor",
    accessor: "executorName",
    sortable: true,
    cell: executorCell,
  },
  {
    // ESI's alliance `faction_id`: the faction it is enlisted with in
    // Factional Warfare, if any.
    id: "militia",
    header: "Militia",
    accessor: "factionName",
    sortable: true,
    filter: { type: "select" },
  },
  {
    id: "founded",
    header: "Founded",
    accessor: "dateFounded",
    sortable: true,
    filter: { type: "date-range" },
    cell: (alliance) => alliance.dateFounded.slice(0, 10),
  },
];

export default function AlliancesPage({ alliances }: Readonly<PageProps>) {
  const totals = useMemo(
    () => ({
      alliances: alliances.length,
      pilots: alliances.reduce((sum, alliance) => sum + alliance.pilots, 0),
    }),
    [alliances],
  );

  return (
    <Container size="xl">
      <Stack>
        <Group>
          <AlliancesIcon width={48} />
          <Stack gap={0}>
            <Title>Alliances</Title>
            <Text c="dimmed" size="sm">
              {formatInteger(totals.alliances)} open alliances,{" "}
              {formatInteger(totals.pilots)} pilots
            </Text>
          </Stack>
        </Group>
        <DataTable
          data={alliances}
          columns={columns}
          rowId={(alliance) => alliance.allianceId}
          initialSort={{ columnId: "pilots", direction: "desc" }}
          withGlobalFilter
          withColumnVisibility
          withPagination
          defaultPageSize={50}
          verticalSpacing="xs"
          highlightOnHover
          striped
        />
      </Stack>
    </Container>
  );
}
