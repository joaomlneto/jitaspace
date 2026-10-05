"use client";

import { useMemo } from "react";
import { Badge, Container, Group, Stack, Text, Title } from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import {
  FactionAnchor,
  RegionAnchor,
  SolarSystemAnchor,
} from "@jitaspace/eve-components";
import { FactionalWarfareIcon } from "@jitaspace/eve-icons";
import {
  CorporationAnchor,
  FactionAvatar,
  SolarSystemSecurityStatusBadge,
} from "@jitaspace/ui";

import { DataTable } from "~/components/DataTable";

export interface FactionRow {
  factionId: number;
  name: string;
  shortDescription: string | null;
  /** Solar systems the SDE gives the faction, inherited from region down. */
  systems: number;
  stations: number;
  stationSystems: number;
  /** NPC corporations belonging to the faction. */
  corporations: number;
  /** Items the SDE attributes to the faction. */
  items: number;
  sizeFactor: number;
  militiaCorporationId: number | null;
  militiaName: string | null;
  headquartersId: number | null;
  headquartersName: string | null;
  headquartersSecurity: number | null;
  regionId: number | null;
  regionName: string | null;
}

export interface PageProps {
  factions: FactionRow[];
}

const numberFormat = new Intl.NumberFormat("en-US");
const countCell = (value: number) => numberFormat.format(value);

function nameCell(faction: FactionRow) {
  return (
    <Group gap="sm" wrap="nowrap">
      <FactionAvatar factionId={faction.factionId} size="md" />
      <Stack gap={0} style={{ minWidth: 0 }}>
        <FactionAnchor factionId={faction.factionId} fw={600}>
          {faction.name}
        </FactionAnchor>
        {faction.shortDescription && (
          <Text size="xs" c="dimmed" lineClamp={1}>
            {faction.shortDescription}
          </Text>
        )}
      </Stack>
    </Group>
  );
}

function headquartersCell(faction: FactionRow) {
  if (faction.headquartersId === null) return null;
  return (
    <Group gap={6} wrap="nowrap">
      {faction.headquartersSecurity !== null && (
        <SolarSystemSecurityStatusBadge
          securityStatus={faction.headquartersSecurity}
          size="sm"
        />
      )}
      <SolarSystemAnchor
        solarSystemId={faction.headquartersId}
        style={{ whiteSpace: "nowrap" }}
      >
        {faction.headquartersName}
      </SolarSystemAnchor>
    </Group>
  );
}

function militiaCell(faction: FactionRow) {
  if (faction.militiaCorporationId === null) return null;
  return (
    <CorporationAnchor corporationId={faction.militiaCorporationId}>
      {faction.militiaName ?? faction.militiaCorporationId}
    </CorporationAnchor>
  );
}

const columns: DataTableColumn<FactionRow>[] = [
  {
    id: "name",
    header: "Faction",
    accessor: "name",
    sortable: true,
    cell: nameCell,
    enableHiding: false,
  },
  {
    id: "systems",
    header: "Systems",
    accessor: "systems",
    sortable: true,
    align: "right",
    filter: { type: "range", min: 0 },
    cell: (faction) => countCell(faction.systems),
  },
  {
    id: "stations",
    header: "Stations",
    accessor: "stations",
    sortable: true,
    align: "right",
    filter: { type: "range", min: 0 },
    cell: (faction) => countCell(faction.stations),
  },
  {
    id: "stationSystems",
    header: "Station systems",
    accessor: "stationSystems",
    sortable: true,
    align: "right",
    defaultVisible: false,
    cell: (faction) => countCell(faction.stationSystems),
  },
  {
    id: "corporations",
    header: "Corporations",
    accessor: "corporations",
    sortable: true,
    align: "right",
    filter: { type: "range", min: 0 },
    cell: (faction) => countCell(faction.corporations),
  },
  {
    id: "items",
    header: "Items",
    accessor: "items",
    sortable: true,
    align: "right",
    filter: { type: "range", min: 0 },
    cell: (faction) => countCell(faction.items),
  },
  {
    id: "headquarters",
    header: "Headquarters",
    accessor: "headquartersName",
    sortable: true,
    cell: headquartersCell,
  },
  {
    // The headquarters' region: a faction can span many.
    id: "region",
    header: "HQ region",
    accessor: "regionName",
    sortable: true,
    filter: { type: "select" },
    cell: (faction) =>
      faction.regionId === null ? null : (
        <RegionAnchor regionId={faction.regionId}>
          {faction.regionName}
        </RegionAnchor>
      ),
  },
  {
    id: "militia",
    header: "Militia",
    accessor: "militiaName",
    sortable: true,
    cell: militiaCell,
  },
  {
    // The six factions with a militia are the six in Faction Warfare.
    id: "warfare",
    header: "Faction Warfare",
    accessor: (faction) => faction.militiaCorporationId !== null,
    sortable: true,
    filter: { type: "boolean" },
    cell: (faction) =>
      faction.militiaCorporationId === null ? null : (
        <Badge color="red" variant="light" size="sm">
          At war
        </Badge>
      ),
  },
  {
    id: "sizeFactor",
    header: "Size factor",
    accessor: "sizeFactor",
    sortable: true,
    align: "right",
    defaultVisible: false,
  },
];

export default function FactionsPage({ factions }: Readonly<PageProps>) {
  const totals = useMemo(
    () => ({
      factions: factions.length,
      warfare: factions.filter(
        (faction) => faction.militiaCorporationId !== null,
      ).length,
    }),
    [factions],
  );

  return (
    <Container size="xl">
      <Stack>
        <Group>
          <FactionalWarfareIcon width={48} />
          <Stack gap={0}>
            <Title>Factions</Title>
            <Text c="dimmed" size="sm">
              {numberFormat.format(totals.factions)} factions,{" "}
              {numberFormat.format(totals.warfare)} of them at war in Faction
              Warfare
            </Text>
          </Stack>
        </Group>
        <DataTable
          data={factions}
          columns={columns}
          rowId={(faction) => faction.factionId}
          initialSort={{ columnId: "systems", direction: "desc" }}
          withGlobalFilter
          withColumnVisibility
          verticalSpacing="xs"
          highlightOnHover
          striped
        />
      </Stack>
    </Container>
  );
}
