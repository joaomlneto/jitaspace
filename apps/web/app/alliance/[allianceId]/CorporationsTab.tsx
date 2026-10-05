"use client";

import { Anchor, Badge, Group, Stack, Text } from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import {
  CharacterAnchor,
  CharacterName,
  CorporationName,
  FactionAnchor,
  FactionName,
  StationAnchor,
} from "@jitaspace/eve-components";
import {
  CharacterAvatar,
  CorporationAnchor,
  CorporationAvatar,
  FactionAvatar,
} from "@jitaspace/ui";

import type { CorporationRow } from "./corporations";
import { DataTable } from "~/components/DataTable";
import { formatDate, formatInteger, formatPercent } from "~/lib/format";

function corporationCell(row: CorporationRow) {
  return (
    <Group gap="xs" wrap="nowrap">
      <CorporationAvatar corporationId={row.corporationId} size="sm" />
      {/* One link per member corporation — keep prefetch off, as the old
          unpaginated list did. */}
      <CorporationAnchor corporationId={row.corporationId} prefetch={false}>
        {row.name ?? <CorporationName span corporationId={row.corporationId} />}
      </CorporationAnchor>
      {row.isExecutor && (
        <Badge size="xs" variant="light">
          Executor
        </Badge>
      )}
      {row.isCreator && (
        <Badge size="xs" variant="light" color="gray">
          Creator
        </Badge>
      )}
    </Group>
  );
}

function ceoCell(row: CorporationRow) {
  if (row.ceoId === null) return null;
  return (
    <Group gap="xs" wrap="nowrap">
      <CharacterAvatar characterId={row.ceoId} size="xs" />
      <CharacterAnchor characterId={row.ceoId} prefetch={false}>
        {row.ceoName ?? <CharacterName span characterId={row.ceoId} />}
      </CharacterAnchor>
    </Group>
  );
}

function militiaCell(row: CorporationRow) {
  if (row.enlistedFactionId === null) return null;
  return (
    <Group gap="xs" wrap="nowrap">
      <FactionAvatar factionId={row.enlistedFactionId} size="xs" />
      <FactionAnchor factionId={row.enlistedFactionId}>
        <FactionName span factionId={row.enlistedFactionId} />
      </FactionAnchor>
    </Group>
  );
}

function homeStationCell(row: CorporationRow) {
  if (row.homeStationId === null) return null;
  return (
    <StationAnchor stationId={row.homeStationId} prefetch={false}>
      {row.homeStationName ?? row.homeStationId}
    </StationAnchor>
  );
}

function websiteCell(row: CorporationRow) {
  if (!row.url || !/^https?:\/\//i.test(row.url)) return null;
  return (
    <Anchor href={row.url} target="_blank" rel="noopener noreferrer nofollow">
      {row.url.replace(/^https?:\/\//i, "").replace(/\/$/, "")}
    </Anchor>
  );
}

const columns: DataTableColumn<CorporationRow>[] = [
  {
    id: "corporationId",
    header: "Corporation ID",
    accessor: "corporationId",
    sortable: true,
    defaultVisible: false,
  },
  {
    id: "name",
    header: "Corporation",
    accessor: "name",
    sortable: true,
    cell: corporationCell,
    enableHiding: false,
  },
  {
    id: "ticker",
    header: "Ticker",
    accessor: "ticker",
    sortable: true,
    cell: (row) => (row.ticker === null ? null : `[${row.ticker}]`),
  },
  {
    id: "pilots",
    header: "Pilots",
    accessor: "memberCount",
    sortable: true,
    align: "right",
    filter: { type: "range", min: 0 },
    cell: (row) =>
      row.memberCount === null ? null : formatInteger(row.memberCount),
  },
  {
    id: "share",
    header: "Share",
    accessor: "share",
    sortable: true,
    align: "right",
    cell: (row) => (row.share === null ? null : formatPercent(row.share)),
  },
  {
    id: "ceo",
    header: "CEO",
    accessor: "ceoName",
    sortable: true,
    cell: ceoCell,
  },
  {
    id: "founded",
    header: "Founded",
    accessor: "dateFounded",
    sortable: true,
    filter: { type: "date-range" },
    cell: (row) => (row.dateFounded ? formatDate(row.dateFounded) : null),
  },
  {
    id: "taxRate",
    header: "Tax",
    accessor: "taxRate",
    sortable: true,
    align: "right",
    // In percent, as the column shows it, not the stored 0–1 fraction.
    filter: { type: "range", min: 0, max: 100, step: 0.5 },
    filterAccessor: (row) => (row.taxRate === null ? null : row.taxRate * 100),
    cell: (row) => (row.taxRate === null ? null : formatPercent(row.taxRate)),
  },
  {
    id: "warEligible",
    header: "War eligible",
    accessor: "warEligible",
    sortable: true,
    filter: { type: "boolean" },
    cell: (row) => {
      if (row.warEligible === null) return null;
      return (
        <Badge
          size="sm"
          variant="light"
          color={row.warEligible ? "red" : "gray"}
        >
          {row.warEligible ? "Yes" : "No"}
        </Badge>
      );
    },
  },
  {
    id: "militia",
    header: "Militia",
    accessor: "enlistedFactionId",
    sortable: true,
    cell: militiaCell,
    defaultVisible: false,
  },
  {
    id: "homeStation",
    header: "Home station",
    accessor: "homeStationName",
    sortable: true,
    cell: homeStationCell,
    defaultVisible: false,
  },
  {
    id: "url",
    header: "Website",
    accessor: "url",
    cell: websiteCell,
    defaultVisible: false,
  },
];

export function CorporationsTab({
  rows,
  isLoading,
  hasProfile,
}: Readonly<{
  rows: CorporationRow[];
  isLoading: boolean;
  /** Whether our database answered; without it every row is ESI-only. */
  hasProfile: boolean;
}>) {
  const unstored = hasProfile
    ? rows.filter((row) => row.memberCount === null).length
    : 0;
  return (
    <Stack gap="sm">
      <DataTable
        data={rows}
        columns={columns}
        rowId={(row) => row.corporationId}
        isLoading={isLoading && rows.length === 0}
        initialSort={{ columnId: "pilots", direction: "desc" }}
        withGlobalFilter
        withColumnVisibility
        withPagination
        defaultPageSize={50}
        verticalSpacing="xs"
        highlightOnHover
        striped
      />
      {unstored > 0 && (
        <Text size="xs" c="dimmed">
          {formatInteger(unstored)}{" "}
          {unstored === 1 ? "corporation" : "corporations"} joined since our
          last hourly refresh; their details appear after the next one.
        </Text>
      )}
    </Stack>
  );
}
