"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Container,
  Group,
  Loader,
  Paper,
  Progress,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import {
  IconBuildingFortress,
  IconBuildingSkyscraper,
  IconExternalLink,
  IconFileText,
  IconHierarchy3,
  IconHistory,
  IconInfoCircle,
  IconListCheck,
  IconMap2,
  IconPackage,
  IconShieldHalf,
  IconSwords,
  IconTarget,
  IconUsersGroup,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { parseAsStringLiteral, useQueryState } from "nuqs";

import type { DataTableColumn } from "@jitaspace/datatable";
import {
  useGetFwStats,
  useGetFwSystems,
  useGetFwWars,
} from "@jitaspace/esi-client";
import {
  ConstellationAnchor,
  FactionAnchor,
  FactionName,
  RegionAnchor,
  SolarSystemAnchor,
  SolarSystemName,
  TypeAnchor,
} from "@jitaspace/eve-components";
import { useEsiNameLookup } from "@jitaspace/hooks";
import { SHIP_TREE_FACTIONS } from "@jitaspace/ship-tree/factions";
import { sanitizeFormattedEveString } from "@jitaspace/tiptap-eve";
import {
  AllianceAnchor,
  AllianceAvatar,
  CategoryAnchor,
  CorporationAnchor,
  CorporationAvatar,
  EveIconAvatar,
  FactionAvatar,
  formatSecurityStatus,
  GroupAnchor,
  RaceAnchor,
  SolarSystemSecurityStatusBadge,
  TypeAvatar,
} from "@jitaspace/ui";

import type {
  FactionContrabandRow,
  FactionCorporationRow,
  FactionDungeonRow,
  FactionEnlistedCorporationRow,
  FactionItemRow,
  FactionLocation,
  FactionMissionRow,
  FactionPageData,
  FactionTables,
} from "./types";
import { DataTable } from "~/components/DataTable";
import { HeroStat, SectionHeading, StatCard } from "~/components/EntityPage";
import { MailMessageViewer } from "~/components/EveMail";
import { EntityHistory } from "../../history/EntityHistory";
import { ENLISTED_CORPORATIONS_SHOWN } from "./constants";
import {
  DEFAULT_FACTION_PAGE_TAB,
  FACTION_PAGE_TABS,
  isFactionPageTab,
} from "./tabs";

export type PageProps = FactionPageData;

// Browser-only and on demand: the ship tree library and its stylesheet load
// when the tab opens, and stay out of the page's cached HTML.
const FactionShipTree = dynamic(() => import("./FactionShipTree"), {
  ssr: false,
  loading: () => <Skeleton h={480} radius="md" />,
});

/** A stable empty table, so a loading tab does not hand DataTable a new array per render. */
const NO_ROWS: never[] = [];

/** The tabs that list rows the page does not carry; opening one fetches them. */
const TABLE_TABS = new Set<string>([
  "territory",
  "corporations",
  "items",
  "contraband",
  "missions",
  "standings",
]);

/** The faction's table rows, from the CDN-cached `/api/faction/[factionId]`. */
function useFactionTables(factionId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["faction-tables", factionId],
    queryFn: async (): Promise<FactionTables> => {
      const response = await fetch(`/api/faction/${factionId}`);
      if (!response.ok) {
        throw new Error(`Faction ${factionId}: HTTP ${response.status}`);
      }
      return (await response.json()) as FactionTables;
    },
    enabled,
    staleTime: Infinity,
  });
}

const numberFormat = new Intl.NumberFormat("en-US");
const formatCount = (value: number) => numberFormat.format(value);
/** "1 epic arc", "2 epic arcs". */
const formatCountOf = (value: number, one: string, many: string) =>
  `${formatCount(value)} ${value === 1 ? one : many}`;
const formatPercent = (value: number) =>
  `${(value * 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
/**
 * A contraband security threshold. The SDE marks "never" and "everywhere" with
 * values outside the security range (an attack threshold of 1.1, a confiscation
 * threshold of -1), which as numbers would read as a system that cannot exist.
 */
const formatSecurityThreshold = (value: number) => {
  if (value > 1) return "Never";
  if (value <= -1) return "Everywhere";
  return `≥ ${formatSecurityStatus(value)}`;
};

/** FW system states, in the order a system moves through them. */
const CONTESTED_COLORS: Record<string, string> = {
  uncontested: "teal",
  contested: "yellow",
  vulnerable: "orange",
  captured: "red",
};

function YesNoBadge({ value }: Readonly<{ value: boolean }>) {
  return (
    <Badge color={value ? "teal" : "red"} variant="light">
      {value ? "Yes" : "No"}
    </Badge>
  );
}

function SystemLink({
  location,
}: Readonly<{
  location: Pick<FactionLocation, "solarSystemId" | "name">;
}>) {
  return (
    <SolarSystemAnchor solarSystemId={location.solarSystemId}>
      {location.name}
    </SolarSystemAnchor>
  );
}

/** "Jita · Kimotoro · The Forge", each part linked. */
function LocationTrail({ location }: Readonly<{ location: FactionLocation }>) {
  return (
    <Group gap={6} wrap="wrap" component="span">
      <SolarSystemSecurityStatusBadge
        securityStatus={location.securityStatus}
        size="sm"
      />
      <SystemLink location={location} />
      <Text span c="dimmed">
        ·
      </Text>
      <ConstellationAnchor constellationId={location.constellationId}>
        {location.constellationName}
      </ConstellationAnchor>
      {location.regionId !== null && (
        <>
          <Text span c="dimmed">
            ·
          </Text>
          <RegionAnchor regionId={location.regionId}>
            {location.regionName}
          </RegionAnchor>
        </>
      )}
    </Group>
  );
}

function securityCell(row: { securityStatus: number }) {
  return (
    <SolarSystemSecurityStatusBadge
      securityStatus={row.securityStatus}
      size="sm"
    />
  );
}

function constellationCell(row: FactionLocation) {
  return (
    <ConstellationAnchor constellationId={row.constellationId}>
      {row.constellationName}
    </ConstellationAnchor>
  );
}

function regionCell(row: FactionLocation) {
  if (row.regionId === null) return null;
  return <RegionAnchor regionId={row.regionId}>{row.regionName}</RegionAnchor>;
}

// ---------------------------------------------------------------------------
// Territory
// ---------------------------------------------------------------------------

interface TerritoryRow extends FactionLocation {
  /** NPC stations, when the system is part of the SDE territory. */
  stations: number | null;
  /** "Home" for the SDE territory, "Occupied" for sovereignty gained since. */
  territory: "Home" | "Occupied";
  /** Who holds it right now, when that is not this faction. */
  holder: string | null;
  holderFactionId: number | null;
  holderAllianceId: number | null;
  flags: string[];
}

function holderCell(row: TerritoryRow) {
  if (row.holderFactionId !== null) {
    return (
      <FactionAnchor factionId={row.holderFactionId}>
        {row.holder ?? row.holderFactionId}
      </FactionAnchor>
    );
  }
  if (row.holderAllianceId !== null) {
    return (
      <AllianceAnchor allianceId={row.holderAllianceId}>
        {row.holder ?? row.holderAllianceId}
      </AllianceAnchor>
    );
  }
  if (row.holder !== null) return <Text size="sm">{row.holder}</Text>;
  return (
    <Badge color="teal" variant="light" size="sm">
      This faction
    </Badge>
  );
}

const territoryColumns: DataTableColumn<TerritoryRow>[] = [
  {
    id: "name",
    header: "System",
    accessor: "name",
    sortable: true,
    enableHiding: false,
    cell: (row) => <SystemLink location={row} />,
  },
  {
    id: "security",
    header: "Security",
    accessor: "securityStatus",
    sortable: true,
    filter: { type: "range", min: -1, max: 1, step: 0.1 },
    cell: securityCell,
  },
  {
    id: "constellation",
    header: "Constellation",
    accessor: "constellationName",
    sortable: true,
    cell: constellationCell,
  },
  {
    id: "region",
    header: "Region",
    accessor: "regionName",
    sortable: true,
    filter: { type: "select" },
    cell: regionCell,
  },
  {
    id: "stations",
    header: "Stations",
    accessor: "stations",
    sortable: true,
    align: "right",
    filter: { type: "range", min: 0 },
  },
  {
    id: "territory",
    header: "Territory",
    accessor: "territory",
    sortable: true,
    filter: { type: "select" },
  },
  {
    id: "holder",
    header: "Held by",
    accessor: (row) => row.holder ?? "This faction",
    sortable: true,
    filter: { type: "select" },
    cell: holderCell,
  },
  {
    id: "flags",
    header: "Role",
    accessor: (row) => row.flags.join(", "),
    cell: (row) => (
      <Group gap={4}>
        {row.flags.map((flag) => (
          <Badge key={flag} size="xs" variant="outline">
            {flag}
          </Badge>
        ))}
      </Group>
    ),
  },
];

function TerritoryPanel({
  faction,
  tables,
  isLoading,
}: Readonly<{
  faction: PageProps["faction"];
  tables: FactionTables | undefined;
  isLoading: boolean;
}>) {
  const rows = useMemo(() => {
    if (!tables) return NO_ROWS;
    const lost = new Map(
      tables.lostSystems.map((system) => [system.solarSystemId, system]),
    );
    const home: TerritoryRow[] = tables.systems.map((system) => {
      const occupier = lost.get(system.solarSystemId);
      const flags = [
        ...(system.isHub ? ["Hub"] : []),
        ...(system.isBorder ? ["Border"] : []),
        ...(system.isFringe ? ["Fringe"] : []),
        ...(system.isCorridor ? ["Corridor"] : []),
      ];
      return {
        ...system,
        stations: system.stations,
        territory: "Home",
        holder: occupier
          ? (occupier.occupierFactionName ??
            occupier.occupierAllianceName ??
            "Unclaimed")
          : null,
        holderFactionId: occupier?.occupierFactionId ?? null,
        holderAllianceId: occupier?.occupierAllianceId ?? null,
        flags,
      };
    });
    const occupied: TerritoryRow[] = tables.sovereignty
      .filter((system) => !system.isHomeTerritory)
      .map((system) => ({
        ...system,
        stations: null,
        territory: "Occupied",
        holder: null,
        holderFactionId: null,
        holderAllianceId: null,
        flags: [],
      }));
    return [...home, ...occupied];
  }, [tables]);

  return (
    <Stack gap="lg">
      {faction.regions.length > 0 && (
        <Stack gap="sm">
          <SectionHeading icon={<IconMap2 size={18} />}>Regions</SectionHeading>
          <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4 }} spacing="sm">
            {faction.regions.map((region) => (
              <StatCard
                key={region.regionId}
                label={region.isFactionRegion ? "Faction region" : "Region"}
                value={
                  <RegionAnchor regionId={region.regionId}>
                    {region.name}
                  </RegionAnchor>
                }
                sub={[
                  `${formatCount(region.systems)} ${
                    region.systems === 1 ? "system" : "systems"
                  }`,
                  ...(region.constellations > 0
                    ? [
                        `${formatCount(region.constellations)} ${
                          region.constellations === 1
                            ? "constellation"
                            : "constellations"
                        }`,
                      ]
                    : []),
                ].join(" · ")}
              />
            ))}
          </SimpleGrid>
        </Stack>
      )}

      <Stack gap="sm">
        <SectionHeading icon={<IconTarget size={18} />}>
          Solar systems
        </SectionHeading>
        <Text size="sm" c="dimmed">
          <b>Home</b> systems are the ones the game data assigns to the faction;{" "}
          <b>Occupied</b> ones it holds today without owning them, such as
          Faction Warfare conquests. <b>Held by</b> shows the current
          sovereignty holder when it is somebody else.
        </Text>
        <DataTable
          data={rows}
          columns={territoryColumns}
          rowId={(row) => row.solarSystemId}
          initialSort={{ columnId: "name", direction: "asc" }}
          isLoading={isLoading}
          emptyText="This faction holds no solar systems."
          withGlobalFilter
          withColumnVisibility
          withPagination
          defaultPageSize={50}
          verticalSpacing="xs"
          highlightOnHover
          striped
        />
      </Stack>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Corporations
// ---------------------------------------------------------------------------

function corporationNameCell(row: { corporationId: number; name: string }) {
  return (
    <Group gap="xs" wrap="nowrap">
      <CorporationAvatar corporationId={row.corporationId} size="sm" />
      <CorporationAnchor corporationId={row.corporationId}>
        {row.name}
      </CorporationAnchor>
    </Group>
  );
}

const corporationColumns: DataTableColumn<FactionCorporationRow>[] = [
  {
    id: "name",
    header: "Corporation",
    accessor: "name",
    sortable: true,
    enableHiding: false,
    cell: (row) => (
      <Group gap="xs" wrap="nowrap">
        {corporationNameCell(row)}
        {row.isMilitia && (
          <Badge size="xs" color="red" variant="light">
            Militia
          </Badge>
        )}
      </Group>
    ),
  },
  {
    id: "ticker",
    header: "Ticker",
    accessor: "ticker",
    sortable: true,
    cell: (row) => `[${row.ticker}]`,
  },
  {
    id: "members",
    header: "Members",
    accessor: "memberCount",
    sortable: true,
    align: "right",
    filter: { type: "range", min: 0 },
    cell: (row) => formatCount(row.memberCount),
  },
  {
    id: "stations",
    header: "Stations",
    accessor: "stations",
    sortable: true,
    align: "right",
    filter: { type: "range", min: 0 },
  },
  {
    id: "lpOffers",
    header: "LP offers",
    accessor: "lpOffers",
    sortable: true,
    align: "right",
    filter: { type: "range", min: 0 },
    cell: (row) =>
      row.lpOffers > 0 ? (
        <Anchor component={Link} href={`/lp-store/${row.corporationId}`}>
          {formatCount(row.lpOffers)}
        </Anchor>
      ) : (
        "–"
      ),
  },
  {
    id: "size",
    header: "Size",
    accessor: "size",
    sortable: true,
    filter: { type: "select" },
  },
  {
    id: "extent",
    header: "Extent",
    accessor: "extent",
    sortable: true,
    filter: { type: "select" },
  },
];

// ---------------------------------------------------------------------------
// Faction Warfare
// ---------------------------------------------------------------------------

const enlistedCorporationColumns: DataTableColumn<FactionEnlistedCorporationRow>[] =
  [
    {
      id: "name",
      header: "Corporation",
      accessor: "name",
      sortable: true,
      enableHiding: false,
      cell: corporationNameCell,
    },
    {
      id: "ticker",
      header: "Ticker",
      accessor: "ticker",
      sortable: true,
      cell: (row) => `[${row.ticker}]`,
    },
    {
      id: "members",
      header: "Members",
      accessor: "memberCount",
      sortable: true,
      align: "right",
      filter: { type: "range", min: 0 },
      cell: (row) => formatCount(row.memberCount),
    },
    {
      id: "alliance",
      header: "Alliance",
      accessor: "allianceName",
      sortable: true,
      filter: { type: "select" },
      cell: (row) =>
        row.allianceId === null ? null : (
          <AllianceAnchor allianceId={row.allianceId}>
            {row.allianceName ?? row.allianceId}
          </AllianceAnchor>
        ),
    },
  ];

interface WarzoneSystemRow {
  solarSystemId: number;
  name: string | null;
  securityStatus: number | null;
  contested: string;
  victoryPoints: number;
  threshold: number;
  ownerFactionId: number;
}

const warzoneColumns: DataTableColumn<WarzoneSystemRow>[] = [
  {
    id: "name",
    header: "System",
    accessor: (row) => row.name ?? String(row.solarSystemId),
    sortable: true,
    enableHiding: false,
    cell: (row) => (
      <Group gap={6} wrap="nowrap">
        {row.securityStatus !== null && (
          <SolarSystemSecurityStatusBadge
            securityStatus={row.securityStatus}
            size="sm"
          />
        )}
        <SolarSystemAnchor solarSystemId={row.solarSystemId}>
          {row.name ?? (
            <SolarSystemName span solarSystemId={row.solarSystemId} />
          )}
        </SolarSystemAnchor>
      </Group>
    ),
  },
  {
    id: "contested",
    header: "Status",
    accessor: "contested",
    sortable: true,
    filter: { type: "select" },
    cell: (row) => (
      <Badge
        size="sm"
        variant="light"
        color={CONTESTED_COLORS[row.contested] ?? "gray"}
      >
        {row.contested}
      </Badge>
    ),
  },
  {
    id: "progress",
    header: "Contested",
    accessor: (row) =>
      row.threshold > 0 ? row.victoryPoints / row.threshold : 0,
    sortable: true,
    cell: (row) => {
      const ratio = row.threshold > 0 ? row.victoryPoints / row.threshold : 0;
      return (
        <Stack gap={2} miw={140}>
          <Progress
            value={Math.min(100, ratio * 100)}
            color={ratio >= 1 ? "red" : "yellow"}
            size="sm"
          />
          <Text size="xs" c="dimmed">
            {formatCount(row.victoryPoints)} / {formatCount(row.threshold)} VP
          </Text>
        </Stack>
      );
    },
  },
  {
    id: "owner",
    header: "Owner",
    accessor: "ownerFactionId",
    sortable: true,
    cell: (row) => (
      <FactionAnchor factionId={row.ownerFactionId}>
        <FactionName span factionId={row.ownerFactionId} />
      </FactionAnchor>
    ),
  },
];

function WarfareTotals({
  label,
  values,
}: Readonly<{
  label: string;
  values: { yesterday: number; last_week: number; total: number };
}>) {
  return (
    <StatCard
      label={label}
      value={formatCount(values.last_week)}
      sub={`last week · ${formatCount(values.yesterday)} yesterday · ${formatCount(values.total)} all time`}
    />
  );
}

function WarfarePanel({
  faction,
  live,
  stats,
  enemies,
  allies,
  warzone,
}: Readonly<
  Pick<PageProps, "faction" | "live"> & {
    stats: FwStats | undefined;
    enemies: number[];
    allies: number[];
    warzone: WarzoneSystemRow[];
  }
>) {
  return (
    <Stack gap="lg">
      {stats && (
        <Stack gap="sm">
          <SectionHeading icon={<IconSwords size={18} />}>
            Faction Warfare
          </SectionHeading>
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
            <StatCard label="Pilots" value={formatCount(stats.pilots)} />
            <StatCard
              label="Systems controlled"
              value={formatCount(stats.systems_controlled)}
            />
            <WarfareTotals label="Kills" values={stats.kills} />
            <WarfareTotals
              label="Victory points"
              values={stats.victory_points}
            />
          </SimpleGrid>
          <Text size="xs" c="dimmed">
            Live from ESI&apos;s Faction Warfare statistics.
          </Text>
        </Stack>
      )}

      {(enemies.length > 0 || allies.length > 0) && (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          {enemies.length > 0 && (
            <StatCard
              label="At war with"
              value={<FactionList factionIds={enemies} />}
            />
          )}
          {allies.length > 0 && (
            <StatCard
              label="Fighting alongside"
              value={<FactionList factionIds={allies} />}
            />
          )}
        </SimpleGrid>
      )}

      {(faction.militiaCorporation !== null ||
        live.enlistedAlliances.length > 0 ||
        live.enlistedCorporationCount > 0) && (
        <Stack gap="sm">
          <SectionHeading icon={<IconShieldHalf size={18} />}>
            Militia
          </SectionHeading>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
            {faction.militiaCorporation && (
              <StatCard
                label="Militia corporation"
                value={corporationNameCell({
                  corporationId: faction.militiaCorporation.id,
                  name: faction.militiaCorporation.name,
                })}
              />
            )}
            <StatCard
              label="Enlisted alliances"
              value={formatCount(live.enlistedAlliances.length)}
            />
            <StatCard
              label="Enlisted corporations"
              value={formatCount(live.enlistedCorporationCount)}
              sub={`${formatCount(live.enlistedPilots)} pilots`}
            />
          </SimpleGrid>
          {live.enlistedAlliances.length > 0 && (
            <Group gap="md">
              {live.enlistedAlliances.map((alliance) => (
                <Group key={alliance.allianceId} gap={6} wrap="nowrap">
                  <AllianceAvatar allianceId={alliance.allianceId} size="sm" />
                  <AllianceAnchor allianceId={alliance.allianceId}>
                    {alliance.name}
                  </AllianceAnchor>
                  <Text size="xs" c="dimmed">
                    &lt;{alliance.ticker}&gt;
                  </Text>
                </Group>
              ))}
            </Group>
          )}
          {live.enlistedCorporationCount > 0 && (
            <Text size="sm" c="dimmed">
              {live.enlistedCorporationCount > ENLISTED_CORPORATIONS_SHOWN
                ? `The ${formatCount(ENLISTED_CORPORATIONS_SHOWN)} largest of ${formatCount(live.enlistedCorporationCount)} enlisted player corporations.`
                : "Enlisted player corporations."}
            </Text>
          )}
          {live.enlistedCorporationCount > 0 && (
            <DataTable
              data={live.enlistedCorporations}
              columns={enlistedCorporationColumns}
              rowId={(row) => row.corporationId}
              initialSort={{ columnId: "members", direction: "desc" }}
              withGlobalFilter
              withPagination
              defaultPageSize={25}
              verticalSpacing="xs"
              highlightOnHover
              striped
            />
          )}
        </Stack>
      )}

      {warzone.length > 0 && (
        <Stack gap="sm">
          <SectionHeading icon={<IconTarget size={18} />}>
            Warzone systems
          </SectionHeading>
          <Text size="sm" c="dimmed">
            Systems this faction occupies in the warzone, and how close each is
            to being captured.
          </Text>
          <DataTable
            data={warzone}
            columns={warzoneColumns}
            rowId={(row) => row.solarSystemId}
            initialSort={{ columnId: "progress", direction: "desc" }}
            withGlobalFilter
            withPagination
            defaultPageSize={25}
            verticalSpacing="xs"
            highlightOnHover
            striped
          />
        </Stack>
      )}
    </Stack>
  );
}

function FactionList({ factionIds }: Readonly<{ factionIds: number[] }>) {
  return (
    <Stack gap={6}>
      {factionIds.map((id) => (
        <Group key={id} gap="xs" wrap="nowrap">
          <FactionAvatar factionId={id} size="sm" />
          <FactionAnchor factionId={id}>
            <FactionName span factionId={id} />
          </FactionAnchor>
        </Group>
      ))}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Items, contraband, missions
// ---------------------------------------------------------------------------

const itemColumns: DataTableColumn<FactionItemRow>[] = [
  {
    id: "name",
    header: "Item",
    accessor: "name",
    sortable: true,
    enableHiding: false,
    cell: (row) => (
      <Group gap="xs" wrap="nowrap">
        <TypeAvatar typeId={row.typeId} size="sm" />
        <TypeAnchor typeId={row.typeId}>{row.name}</TypeAnchor>
      </Group>
    ),
  },
  {
    id: "group",
    header: "Group",
    accessor: "groupName",
    sortable: true,
    filter: { type: "select" },
    cell: (row) => (
      <GroupAnchor groupId={row.groupId}>{row.groupName}</GroupAnchor>
    ),
  },
  {
    id: "category",
    header: "Category",
    accessor: "categoryName",
    sortable: true,
    filter: { type: "select" },
    cell: (row) => (
      <CategoryAnchor categoryId={row.categoryId}>
        {row.categoryName}
      </CategoryAnchor>
    ),
  },
  {
    id: "metaGroup",
    header: "Meta group",
    accessor: "metaGroupName",
    sortable: true,
    filter: { type: "select" },
  },
  {
    id: "published",
    header: "Published",
    accessor: "published",
    sortable: true,
    filter: { type: "boolean" },
    defaultVisible: false,
    cell: (row) => <YesNoBadge value={row.published} />,
  },
];

const contrabandColumns: DataTableColumn<FactionContrabandRow>[] = [
  {
    id: "name",
    header: "Item",
    accessor: "name",
    sortable: true,
    enableHiding: false,
    cell: (row) => (
      <Group gap="xs" wrap="nowrap">
        <TypeAvatar typeId={row.typeId} size="sm" />
        <TypeAnchor typeId={row.typeId}>{row.name}</TypeAnchor>
      </Group>
    ),
  },
  {
    id: "fine",
    header: "Fine",
    accessor: "fineByValue",
    sortable: true,
    align: "right",
    cell: (row) => `${formatPercent(row.fineByValue)} of value`,
  },
  {
    id: "standingLoss",
    header: "Standing loss",
    accessor: "standingLoss",
    sortable: true,
    align: "right",
    cell: (row) => row.standingLoss.toLocaleString("en-US"),
  },
  {
    id: "confiscate",
    header: "Confiscated at",
    accessor: "confiscateMinSec",
    sortable: true,
    align: "right",
    cell: (row) => formatSecurityThreshold(row.confiscateMinSec),
  },
  {
    id: "attack",
    header: "Attacked at",
    accessor: "attackMinSec",
    sortable: true,
    align: "right",
    cell: (row) => formatSecurityThreshold(row.attackMinSec),
  },
];

const missionColumns: DataTableColumn<FactionMissionRow>[] = [
  {
    id: "name",
    header: "Mission",
    accessor: "name",
    sortable: true,
    enableHiding: false,
  },
  {
    id: "kind",
    header: "Kind",
    accessor: "kind",
    sortable: true,
    filter: { type: "select" },
  },
  {
    id: "reward",
    header: "Reward",
    accessor: "rewardTypeName",
    sortable: true,
    cell: (row) =>
      row.rewardTypeId === null ? null : (
        <Group gap="xs" wrap="nowrap">
          <TypeAvatar typeId={row.rewardTypeId} size="sm" />
          <TypeAnchor typeId={row.rewardTypeId}>
            {row.rewardQuantity !== null && row.rewardQuantity > 1
              ? `${formatCount(row.rewardQuantity)} × `
              : ""}
            {row.rewardTypeName ?? row.rewardTypeId}
          </TypeAnchor>
        </Group>
      ),
  },
  {
    id: "id",
    header: "Mission ID",
    accessor: "missionId",
    sortable: true,
    align: "right",
    defaultVisible: false,
  },
  {
    id: "standings",
    header: "Standing rewards",
    accessor: "hasStandingRewards",
    sortable: true,
    filter: { type: "boolean" },
    cell: (row) => <YesNoBadge value={row.hasStandingRewards} />,
  },
];

const dungeonColumns: DataTableColumn<FactionDungeonRow>[] = [
  {
    id: "name",
    header: "Site",
    accessor: "name",
    sortable: true,
    enableHiding: false,
  },
  {
    id: "id",
    header: "Dungeon ID",
    accessor: "dungeonId",
    sortable: true,
    align: "right",
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface FwStats {
  faction_id: number;
  pilots: number;
  systems_controlled: number;
  kills: { yesterday: number; last_week: number; total: number };
  victory_points: { yesterday: number; last_week: number; total: number };
}

export default function FactionPage({
  faction,
  live,
  counts,
}: Readonly<PageProps>) {
  const { factionId } = faction;
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsStringLiteral(FACTION_PAGE_TABS)
      .withDefault(DEFAULT_FACTION_PAGE_TAB)
      .withOptions({ history: "replace" }),
  );

  const { data: fwStatsResponse } = useGetFwStats();
  const { data: fwWarsResponse } = useGetFwWars();
  const { data: fwSystemsResponse } = useGetFwSystems();

  const fwStats = useMemo(
    () => fwStatsResponse?.data.find((entry) => entry.faction_id === factionId),
    [fwStatsResponse, factionId],
  );

  const { enemies, allies } = useMemo(() => {
    const wars = fwWarsResponse?.data ?? [];
    const enemyIds = wars
      .filter((war) => war.faction_id === factionId)
      .map((war) => war.against_id);
    const enemySet = new Set(enemyIds);
    // Allies: the other factions at war with one of this faction's enemies.
    const allyIds = wars
      .filter(
        (war) =>
          war.faction_id !== factionId &&
          enemySet.has(war.against_id) &&
          !enemySet.has(war.faction_id),
      )
      .map((war) => war.faction_id);
    return {
      enemies: [...enemySet].sort((a, b) => a - b),
      allies: [...new Set(allyIds)].sort((a, b) => a - b),
    };
  }, [fwWarsResponse, factionId]);

  // The warzone systems this faction occupies; named below, once known.
  const occupiedWarzone = useMemo(
    () =>
      (fwSystemsResponse?.data ?? []).filter(
        (system) => system.occupier_faction_id === factionId,
      ),
    [fwSystemsResponse, factionId],
  );

  const shipTreeFaction = SHIP_TREE_FACTIONS.find(
    (entry) => entry.id === factionId,
  );

  const hasWarfare =
    fwStats !== undefined ||
    enemies.length > 0 ||
    occupiedWarzone.length > 0 ||
    faction.militiaCorporation !== null ||
    live.enlistedAlliances.length > 0 ||
    live.enlistedCorporationCount > 0;
  const hasTerritory = counts.territory > 0 || faction.regions.length > 0;
  const hasMissions =
    counts.missions > 0 || faction.epicArcs.length > 0 || counts.dungeons > 0;

  const visibleTabs = new Set<string>([
    "overview",
    "history",
    ...(faction.description.trim() ? ["description"] : []),
    ...(hasTerritory ? ["territory"] : []),
    ...(counts.corporations > 0 ? ["corporations"] : []),
    ...(hasWarfare ? ["warfare"] : []),
    ...(counts.items > 0 ? ["items"] : []),
    ...(shipTreeFaction ? ["ship-tree"] : []),
    ...(counts.contraband > 0 ? ["contraband"] : []),
    ...(hasMissions ? ["missions"] : []),
    ...(counts.standingRestrictions > 0 ? ["standings"] : []),
  ]);
  // A deep link to a tab this faction has nothing for would select a tab that
  // is not rendered, leaving the page blank; show the overview instead.
  const selectedTab = visibleTabs.has(activeTab)
    ? activeTab
    : DEFAULT_FACTION_PAGE_TAB;

  const tablesQuery = useFactionTables(factionId, TABLE_TABS.has(selectedTab));
  const tables = tablesQuery.data;
  // Pending, not merely "no data yet": a fetch that failed must stop loading.
  const tablesLoading = tablesQuery.isPending;

  // Names and security for warzone systems, from the rows the server already
  // resolved, when another tab has fetched them; anything else falls back to
  // an ESI name lookup.
  const knownSystems = useMemo(() => {
    const known = new Map<number, FactionLocation>();
    if (faction.homeSystem) {
      known.set(faction.homeSystem.solarSystemId, faction.homeSystem);
    }
    for (const system of [
      ...(tables?.systems ?? []),
      ...(tables?.sovereignty ?? []),
      ...(tables?.lostSystems ?? []),
    ]) {
      known.set(system.solarSystemId, system);
    }
    return known;
  }, [faction.homeSystem, tables]);

  // The rest of the names in one batched `/universe/names` call, into the rows
  // themselves: the table's search and sort read the name from the row, not
  // from what the cell draws.
  const unnamedWarzoneSystems = useMemo(
    () =>
      occupiedWarzone
        .filter((system) => !knownSystems.has(system.solar_system_id))
        .map((system) => ({
          id: system.solar_system_id,
          category: "solar_system" as const,
        })),
    [occupiedWarzone, knownSystems],
  );
  const warzoneNames = useEsiNameLookup(unnamedWarzoneSystems);

  const warzone = useMemo<WarzoneSystemRow[]>(
    () =>
      occupiedWarzone.map((system) => {
        const known = knownSystems.get(system.solar_system_id);
        return {
          solarSystemId: system.solar_system_id,
          name:
            known?.name ??
            warzoneNames[system.solar_system_id.toString()]?.value?.name ??
            null,
          securityStatus: known?.securityStatus ?? null,
          contested: system.contested,
          victoryPoints: system.victory_points,
          threshold: system.victory_points_threshold,
          ownerFactionId: system.owner_faction_id,
        };
      }),
    [occupiedWarzone, knownSystems, warzoneNames],
  );

  const militiaPilots = fwStats?.pilots;
  const totalSystems = counts.territory;

  const tab = (value: string, icon: ReactNode, label: string, count?: number) =>
    visibleTabs.has(value) && (
      <Tabs.Tab
        value={value}
        leftSection={icon}
        rightSection={
          count === undefined ? undefined : (
            <Badge size="xs" variant="light" color="gray">
              {formatCount(count)}
            </Badge>
          )
        }
      >
        {label}
      </Tabs.Tab>
    );

  return (
    <Container size="lg" py="md">
      <Stack gap="lg">
        {/* Hero */}
        <Paper withBorder radius="md" p="lg">
          <Group align="flex-start" gap="xl" wrap="wrap">
            <Box
              style={{
                width: 170,
                height: 170,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                borderRadius: 8,
                border: "1px solid rgba(108, 132, 151, 0.28)",
                background:
                  "radial-gradient(circle at 50% 35%, rgba(44, 66, 88, 0.4), rgba(6, 9, 15, 0.92))",
              }}
            >
              <FactionAvatar
                factionId={factionId}
                size={150}
                radius={0}
                alt={faction.name}
              />
            </Box>

            <Stack gap="sm" style={{ flex: 1, minWidth: 240 }}>
              <Text size="sm" c="dimmed">
                Faction
              </Text>
              <Group gap="sm" align="center">
                <Title order={2}>{faction.name}</Title>
                {hasWarfare && (
                  <Badge color="red" variant="light">
                    Faction Warfare
                  </Badge>
                )}
              </Group>
              {faction.shortDescription && (
                <Text fs="italic" c="dimmed">
                  {faction.shortDescription}
                </Text>
              )}

              {faction.homeSystem && (
                <Group gap="xs" align="center">
                  <Text size="sm" c="dimmed">
                    Headquarters
                  </Text>
                  <LocationTrail location={faction.homeSystem} />
                </Group>
              )}

              <Group gap="xl">
                <HeroStat label="Systems" value={formatCount(totalSystems)} />
                <HeroStat
                  label="Stations"
                  value={formatCount(faction.stationCount)}
                />
                {counts.corporations > 0 && (
                  <HeroStat
                    label="Corporations"
                    value={formatCount(counts.corporations)}
                  />
                )}
                {/* A faction with a militia keeps the slot while ESI answers,
                    so the number does not push the page down when it lands. */}
                {(faction.militiaCorporation !== null ||
                  militiaPilots !== undefined) && (
                  <HeroStat
                    label="Militia pilots"
                    value={
                      militiaPilots === undefined
                        ? "—"
                        : formatCount(militiaPilots)
                    }
                  />
                )}
              </Group>

              <Group gap="xs">
                <Button
                  component={Link}
                  href={`https://zkillboard.com/faction/${factionId}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="xs"
                  leftSection={<IconExternalLink size={14} />}
                >
                  zKillboard
                </Button>
              </Group>
            </Stack>
          </Group>
        </Paper>

        {tablesQuery.isError && TABLE_TABS.has(selectedTab) && (
          <Alert color="red" variant="light">
            This tab&apos;s data could not be loaded. Try reloading the page.
          </Alert>
        )}

        <Tabs
          value={selectedTab}
          onChange={(value) => {
            if (isFactionPageTab(value)) void setActiveTab(value);
          }}
          variant="outline"
          keepMounted={false}
        >
          <Tabs.List>
            {tab("overview", <IconInfoCircle size={16} />, "Overview")}
            {tab("description", <IconFileText size={16} />, "Description")}
            {tab(
              "territory",
              <IconMap2 size={16} />,
              "Territory",
              totalSystems,
            )}
            {tab(
              "corporations",
              <IconBuildingSkyscraper size={16} />,
              "Corporations",
              counts.corporations,
            )}
            {tab("warfare", <IconSwords size={16} />, "Warfare")}
            {tab("items", <IconPackage size={16} />, "Items", counts.items)}
            {tab("ship-tree", <IconHierarchy3 size={16} />, "Ship Tree")}
            {tab(
              "contraband",
              <IconShieldHalf size={16} />,
              "Contraband",
              counts.contraband,
            )}
            {tab(
              "missions",
              <IconTarget size={16} />,
              "Missions & Sites",
              counts.missions + counts.dungeons,
            )}
            {tab(
              "standings",
              <IconBuildingFortress size={16} />,
              "Standings",
              counts.standingRestrictions,
            )}
            {tab("history", <IconHistory size={16} />, "History")}
          </Tabs.List>

          {/* Overview */}
          <Tabs.Panel value="overview" pt="lg">
            <OverviewPanel
              faction={faction}
              counts={counts}
              totalSystems={totalSystems}
              fwStats={fwStats}
            />
          </Tabs.Panel>

          {/* Description */}
          {visibleTabs.has("description") && (
            <Tabs.Panel value="description" pt="lg">
              <Paper withBorder radius="md" p="md">
                <MailMessageViewer
                  content={sanitizeFormattedEveString(faction.description)}
                />
              </Paper>
            </Tabs.Panel>
          )}

          {/* Territory */}
          {visibleTabs.has("territory") && (
            <Tabs.Panel value="territory" pt="lg">
              <TerritoryPanel
                faction={faction}
                tables={tables}
                isLoading={tablesLoading}
              />
            </Tabs.Panel>
          )}

          {/* Corporations */}
          {visibleTabs.has("corporations") && (
            <Tabs.Panel value="corporations" pt="lg">
              <Stack gap="sm">
                <Text size="sm" c="dimmed">
                  The NPC corporations that make up the faction. Corporations
                  with a loyalty point store link to their offers.
                </Text>
                <DataTable
                  data={tables?.corporations ?? NO_ROWS}
                  isLoading={tablesLoading}
                  columns={corporationColumns}
                  rowId={(row) => row.corporationId}
                  initialSort={{ columnId: "name", direction: "asc" }}
                  withGlobalFilter
                  withColumnVisibility
                  verticalSpacing="xs"
                  highlightOnHover
                  striped
                />
              </Stack>
            </Tabs.Panel>
          )}

          {/* Faction Warfare */}
          {visibleTabs.has("warfare") && (
            <Tabs.Panel value="warfare" pt="lg">
              <WarfarePanel
                faction={faction}
                live={live}
                stats={fwStats}
                enemies={enemies}
                allies={allies}
                warzone={warzone}
              />
            </Tabs.Panel>
          )}

          {/* Items */}
          {visibleTabs.has("items") && (
            <Tabs.Panel value="items" pt="lg">
              <Stack gap="sm">
                <Text size="sm" c="dimmed">
                  Ships, modules and other items the game data attributes to
                  this faction.
                </Text>
                <DataTable
                  data={tables?.items ?? NO_ROWS}
                  isLoading={tablesLoading}
                  columns={itemColumns}
                  rowId={(row) => row.typeId}
                  initialSort={{ columnId: "name", direction: "asc" }}
                  withGlobalFilter
                  withColumnVisibility
                  withPagination
                  defaultPageSize={50}
                  verticalSpacing="xs"
                  highlightOnHover
                  striped
                />
              </Stack>
            </Tabs.Panel>
          )}

          {/* Ship tree */}
          {shipTreeFaction && (
            <Tabs.Panel value="ship-tree" pt="lg">
              <FactionShipTree faction={shipTreeFaction.id} />
            </Tabs.Panel>
          )}

          {/* Contraband */}
          {visibleTabs.has("contraband") && (
            <Tabs.Panel value="contraband" pt="lg">
              <Stack gap="sm">
                <Text size="sm" c="dimmed">
                  Goods this faction&apos;s customs officials police in its
                  space. Customs confiscate them, and fine you, in systems at or
                  above the listed security status, and open fire where an
                  attack threshold is listed.
                </Text>
                <DataTable
                  data={tables?.contraband ?? NO_ROWS}
                  isLoading={tablesLoading}
                  columns={contrabandColumns}
                  rowId={(row) => row.typeId}
                  initialSort={{ columnId: "name", direction: "asc" }}
                  withGlobalFilter
                  verticalSpacing="xs"
                  highlightOnHover
                  striped
                />
              </Stack>
            </Tabs.Panel>
          )}

          {/* Missions & sites */}
          {visibleTabs.has("missions") && (
            <Tabs.Panel value="missions" pt="lg">
              <MissionsPanel
                faction={faction}
                counts={counts}
                tables={tables}
                isLoading={tablesLoading}
              />
            </Tabs.Panel>
          )}

          {/* Standings */}
          {visibleTabs.has("standings") && (
            <Tabs.Panel value="standings" pt="lg">
              <Stack gap="sm">
                <SectionHeading icon={<IconBuildingFortress size={18} />}>
                  Station services
                </SectionHeading>
                <Text size="sm" c="dimmed">
                  The standing with this faction a pilot needs before its
                  stations offer each service.
                </Text>
                {tablesLoading && (
                  <Group justify="center" p="md">
                    <Loader size="sm" />
                  </Group>
                )}
                {tables && (
                  <Paper withBorder radius="md" p="sm">
                    <Table highlightOnHover verticalSpacing="xs">
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Service</Table.Th>
                          <Table.Th ta="right">Minimum standing</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {tables.standingRestrictions.map((restriction) => (
                          <Table.Tr key={restriction.stationServiceId}>
                            <Table.Td>
                              {restriction.serviceName ??
                                `Service ${restriction.stationServiceId}`}
                            </Table.Td>
                            <Table.Td ta="right" ff="monospace">
                              {restriction.minimumStanding.toFixed(2)}
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Paper>
                )}
              </Stack>
            </Tabs.Panel>
          )}

          {/* History — per-build change timeline (loaded on demand) */}
          <Tabs.Panel value="history" pt="lg">
            <EntityHistory entityType="faction" entityId={factionId} embedded />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}

function OverviewPanel({
  faction,
  counts,
  totalSystems,
  fwStats,
}: Readonly<
  Pick<PageProps, "faction" | "counts"> & {
    totalSystems: number;
    fwStats: FwStats | undefined;
  }
>) {
  return (
    <Stack gap="lg">
      <Stack gap="sm">
        <SectionHeading icon={<IconInfoCircle size={18} />}>
          Identity
        </SectionHeading>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
          <StatCard label="Faction ID" value={faction.factionId} />
          {faction.corporation && (
            <StatCard
              label="Executive corporation"
              value={corporationNameCell({
                corporationId: faction.corporation.id,
                name: faction.corporation.name,
              })}
              sub={`ID ${faction.corporation.id}`}
            />
          )}
          {faction.militiaCorporation && (
            <StatCard
              label="Militia"
              value={corporationNameCell({
                corporationId: faction.militiaCorporation.id,
                name: faction.militiaCorporation.name,
              })}
              sub={`ID ${faction.militiaCorporation.id}`}
            />
          )}
          {faction.homeSystem && (
            <StatCard
              label="Headquarters"
              value={<SystemLink location={faction.homeSystem} />}
              sub={
                <Group gap={4} component="span">
                  <span>
                    {formatSecurityStatus(faction.homeSystem.securityStatus)} ·
                  </span>
                  {faction.homeSystem.regionId !== null && (
                    <RegionAnchor
                      regionId={faction.homeSystem.regionId}
                      size="xs"
                    >
                      {faction.homeSystem.regionName}
                    </RegionAnchor>
                  )}
                </Group>
              }
            />
          )}
          <StatCard
            label="Size factor"
            value={faction.sizeFactor.toLocaleString("en-US")}
          />
          <StatCard
            label="Unique name"
            value={<YesNoBadge value={faction.isUnique} />}
          />
        </SimpleGrid>
      </Stack>

      <Stack gap="sm">
        <SectionHeading icon={<IconMap2 size={18} />}>Presence</SectionHeading>
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
          <StatCard
            label="Regions"
            value={formatCount(faction.regions.length)}
          />
          <StatCard
            label="Constellations"
            value={formatCount(faction.constellations)}
          />
          <StatCard
            label="Solar systems"
            value={formatCount(totalSystems)}
            sub={
              counts.sovereignty > 0
                ? `${formatCount(counts.sovereignty)} held today`
                : undefined
            }
          />
          <StatCard
            label="Stations"
            value={formatCount(faction.stationCount)}
            sub={`in ${formatCount(faction.stationSystemCount)} systems`}
          />
          <StatCard
            label="NPC corporations"
            value={formatCount(counts.corporations)}
          />
          <StatCard label="Items" value={formatCount(counts.items)} />
          <StatCard
            label="Missions"
            value={formatCount(counts.missions)}
            sub={
              faction.epicArcs.length > 0
                ? formatCountOf(
                    faction.epicArcs.length,
                    "epic arc",
                    "epic arcs",
                  )
                : undefined
            }
          />
          <StatCard
            label="Contraband goods"
            value={formatCount(counts.contraband)}
          />
        </SimpleGrid>
      </Stack>

      {fwStats && (
        <Stack gap="sm">
          <SectionHeading icon={<IconSwords size={18} />}>
            Faction Warfare
          </SectionHeading>
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
            <StatCard label="Pilots" value={formatCount(fwStats.pilots)} />
            <StatCard
              label="Systems controlled"
              value={formatCount(fwStats.systems_controlled)}
            />
            <StatCard
              label="Kills last week"
              value={formatCount(fwStats.kills.last_week)}
            />
            <StatCard
              label="VP last week"
              value={formatCount(fwStats.victory_points.last_week)}
            />
          </SimpleGrid>
        </Stack>
      )}

      {faction.races.length > 0 && (
        <Stack gap="sm">
          <SectionHeading icon={<IconUsersGroup size={18} />}>
            Races
          </SectionHeading>
          <SimpleGrid cols={{ base: 1, xs: 2, sm: 4 }} spacing="sm">
            {faction.races.map((race) => (
              <Paper key={race.raceId} withBorder radius="md" p="sm">
                <Group gap="sm" wrap="nowrap">
                  <EveIconAvatar iconId={race.iconId} size="md" alt="" />
                  <Stack gap={0}>
                    <RaceAnchor raceId={race.raceId} fw={600}>
                      {race.name}
                    </RaceAnchor>
                    <Text size="xs" c="dimmed">
                      {race.isHomeRace ? "Home race" : "Member race"}
                    </Text>
                  </Stack>
                </Group>
              </Paper>
            ))}
          </SimpleGrid>
        </Stack>
      )}

      {faction.starbaseCharters.length > 0 && (
        <Stack gap="sm">
          <SectionHeading icon={<IconBuildingFortress size={18} />}>
            Starbase charters
          </SectionHeading>
          <Text size="sm" c="dimmed">
            A control tower anchored in this faction&apos;s space burns its
            charter as fuel.
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            {faction.starbaseCharters.map((charter) => (
              <Paper key={charter.typeId} withBorder radius="md" p="sm">
                <Group gap="sm" wrap="nowrap">
                  <TypeAvatar typeId={charter.typeId} size="md" />
                  <Stack gap={0}>
                    <TypeAnchor typeId={charter.typeId} fw={600}>
                      {charter.name}
                    </TypeAnchor>
                    {charter.minSecurityLevel !== null && (
                      <Text size="xs" c="dimmed">
                        Required at security{" "}
                        {formatSecurityStatus(charter.minSecurityLevel)} and
                        above
                      </Text>
                    )}
                  </Stack>
                </Group>
              </Paper>
            ))}
          </SimpleGrid>
        </Stack>
      )}

      {faction.skillPlans.length > 0 && (
        <Stack gap="sm">
          <SectionHeading icon={<IconListCheck size={18} />}>
            Skill plans
          </SectionHeading>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            {faction.skillPlans.map((plan) => (
              <StatCard
                key={plan.skillPlanId}
                label={`${formatCount(plan.skills)} skills`}
                value={plan.name}
                sub={
                  // The full text stays in the page; long ones are clamped.
                  <Text size="xs" lineClamp={4} title={plan.description}>
                    {plan.description}
                  </Text>
                }
              />
            ))}
          </SimpleGrid>
        </Stack>
      )}
    </Stack>
  );
}

function MissionsPanel({
  faction,
  counts,
  tables,
  isLoading,
}: Readonly<
  Pick<PageProps, "faction" | "counts"> & {
    tables: FactionTables | undefined;
    isLoading: boolean;
  }
>) {
  return (
    <Stack gap="lg">
      {faction.epicArcs.length > 0 && (
        <Stack gap="sm">
          <SectionHeading icon={<IconTarget size={18} />}>
            Epic arcs
          </SectionHeading>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
            {faction.epicArcs.map((arc) => (
              <Paper key={arc.epicArcId} withBorder radius="md" p="sm">
                <Group gap="sm" wrap="nowrap">
                  {arc.iconId !== null && (
                    <EveIconAvatar iconId={arc.iconId} size="md" alt="" />
                  )}
                  <Stack gap={0}>
                    <Text fw={600} c="gray.0">
                      {arc.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {formatCount(arc.missions)}{" "}
                      {arc.missions === 1 ? "mission" : "missions"}
                    </Text>
                  </Stack>
                </Group>
              </Paper>
            ))}
          </SimpleGrid>
        </Stack>
      )}

      {counts.missions > 0 && (
        <Stack gap="sm">
          <SectionHeading icon={<IconTarget size={18} />}>
            Missions
          </SectionHeading>
          <DataTable
            data={tables?.missions ?? NO_ROWS}
            isLoading={isLoading}
            columns={missionColumns}
            rowId={(row) => row.missionId}
            initialSort={{ columnId: "name", direction: "asc" }}
            withGlobalFilter
            withColumnVisibility
            withPagination
            defaultPageSize={25}
            verticalSpacing="xs"
            highlightOnHover
            striped
          />
        </Stack>
      )}

      {counts.dungeons > 0 && (
        <Stack gap="sm">
          <SectionHeading icon={<IconMap2 size={18} />}>
            Dungeons &amp; sites
          </SectionHeading>
          <DataTable
            data={tables?.dungeons ?? NO_ROWS}
            isLoading={isLoading}
            columns={dungeonColumns}
            rowId={(row) => row.dungeonId}
            initialSort={{ columnId: "name", direction: "asc" }}
            withGlobalFilter
            withPagination
            defaultPageSize={25}
            verticalSpacing="xs"
            highlightOnHover
            striped
          />
        </Stack>
      )}
    </Stack>
  );
}
