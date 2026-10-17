"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Anchor,
  Box,
  Button,
  Container,
  Group,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { IconExternalLink, IconHistory } from "@tabler/icons-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";

import type { DataTableColumn } from "@jitaspace/datatable";
import {
  CategorySolarSystemIcon,
  ControlConstellationLayoutIcon,
  ControlRegionLayoutIcon,
  IncursionsIcon,
  WindowInfoIcon,
} from "@jitaspace/eve-icons";

import type { RegionPageTab } from "./tabs";
import type { RegionIncursions, RegionPageData } from "./types";
import type {
  SystemsById,
  UniverseSystem,
} from "~/components/UniversePage/types";
import type { EntityHistoryData } from "~/lib/history-entity-page";
import { EveTime, STATE_LABEL } from "~/app/incursions/parts";
import { ConstellationAnchor } from "~/components/Anchor";
import { DataTable } from "~/components/DataTable";
import { FactionLine, HeroCard, HeroStat } from "~/components/EntityPage";
import { MailMessageViewer } from "~/components/EveMail";
import { HoverPrefetchLink } from "~/components/Link";
import {
  ActiveIncursionBadge,
  ActiveIncursionCard,
  activeIncursions,
  bandOf,
  GateNeighbours,
  IncursionHistory,
  isWormholeRegion,
  latestStagingByConstellation,
  SecurityRange,
  SystemsTable,
  UniverseFigures,
  UniverseHeroStats,
} from "~/components/UniversePage";
import { formatInteger } from "~/lib/format";
import { EmbeddedEntityHistory } from "../../history/EntityHistory";
import {
  DEFAULT_REGION_PAGE_TAB,
  isRegionPageTab,
  REGION_PAGE_TABS,
} from "./tabs";

export interface RegionPageProps {
  region: RegionPageData;
  incursions: RegionIncursions;
  /** Null when the change history could not be read. */
  history: EntityHistoryData | null;
}

const dotlanName = (name: string) =>
  encodeURIComponent(name.replaceAll(" ", "_"));

/** Where else to look the region up. */
const externalLinks = (regionId: number, name: string) => [
  {
    label: "DOTLAN EveMaps",
    href: `https://evemaps.dotlan.net/map/${dotlanName(name)}`,
  },
  { label: "zKillboard", href: `https://zkillboard.com/region/${regionId}/` },
  { label: "Eveeye", href: `https://eveeye.com/?m=${regionId}` },
  {
    label: "Adam4EVE",
    href: `https://www.adam4eve.eu/location.php?id=${regionId}`,
  },
];

interface ConstellationRow {
  constellationId: number;
  name: string;
  systems: UniverseSystem[];
  systemCount: number;
  minSecurity: number | null;
  bands: string[];
  stationCount: number;
  incursionCount: number;
  latestIncursionAt: string | null;
  /** The state of the incursion running there, if one is. */
  activeState: string | null;
  isMapped: boolean;
}

const constellationColumns: DataTableColumn<ConstellationRow>[] = [
  {
    id: "name",
    header: "Constellation",
    accessor: "name",
    sortable: true,
    filter: { type: "text" },
    cell: (row) => (
      <ConstellationAnchor constellationId={row.constellationId}>
        {row.name}
      </ConstellationAnchor>
    ),
  },
  {
    id: "systemCount",
    header: "Systems",
    accessor: "systemCount",
    sortable: true,
    align: "right",
    filter: { type: "range", min: 0 },
  },
  {
    id: "security",
    header: "Security",
    accessor: "minSecurity",
    sortable: true,
    cell: (row) => <SecurityRange systems={row.systems} />,
  },
  {
    id: "bands",
    header: "Bands",
    accessor: "bands",
    filter: { type: "multi-select" },
    cell: (row) => row.bands.join(", "),
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
  {
    id: "activeState",
    header: "Incursion now",
    accessor: "activeState",
    sortable: true,
    filter: { type: "multi-select" },
  },
  {
    id: "isMapped",
    header: "Layout mapped",
    accessor: "isMapped",
    filter: { type: "boolean" },
    cell: (row) => (row.isMapped ? "Yes" : "No"),
    defaultVisible: false,
  },
];

function ConstellationsTable({
  region,
  incursions,
}: Readonly<{ region: RegionPageData; incursions: RegionIncursions }>) {
  const isWormhole = isWormholeRegion(region.regionId);
  const rows = useMemo<ConstellationRow[]>(
    () =>
      region.constellations.map(({ id, name }) => {
        const systems = region.systems.filter(
          (system) => system.constellationId === id,
        );
        const own = incursions.incursions.filter(
          (incursion) => incursion.constellationId === id,
        );
        const active = own.find((incursion) => incursion.endedAt === null);
        return {
          constellationId: id,
          name: name ?? String(id),
          systems,
          systemCount: systems.length,
          minSecurity:
            systems.length === 0
              ? null
              : Math.min(...systems.map((system) => system.securityStatus)),
          bands: [
            ...new Set(
              systems.map((system) =>
                bandOf(system.securityStatus, isWormhole),
              ),
            ),
          ],
          stationCount: systems.reduce((sum, s) => sum + s.stationCount, 0),
          incursionCount: own.length,
          latestIncursionAt: own[0]?.firstSeenAt ?? null,
          activeState: active ? STATE_LABEL[active.state] : null,
          isMapped: systems.some((system) => system.siteRole !== null),
        };
      }),
    [region, incursions, isWormhole],
  );
  return (
    <DataTable
      data={rows}
      columns={constellationColumns}
      rowId={(row) => row.constellationId}
      withGlobalFilter
      withColumnVisibility
      initialSort={{ columnId: "name", direction: "asc" }}
      verticalSpacing="xs"
      withTableBorder
      highlightOnHover
      striped
    />
  );
}

export default function RegionPage({
  region,
  incursions,
  history,
}: Readonly<RegionPageProps>) {
  const { regionId, name, faction, systems, constellations } = region;
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsStringLiteral(REGION_PAGE_TABS)
      .withDefault(DEFAULT_REGION_PAGE_TAB)
      .withOptions({ history: "replace" }),
  );
  const systemsById = useMemo<SystemsById>(
    () => new Map(systems.map((system) => [system.solarSystemId, system])),
    [systems],
  );
  const constellationNames = useMemo(
    () => new Map(constellations.map((c) => [c.id, c.name ?? String(c.id)])),
    [constellations],
  );
  const staging = useMemo(
    () => new Set(latestStagingByConstellation(incursions.incursions).values()),
    [incursions.incursions],
  );
  const active = activeIncursions(incursions);
  const isWormhole = isWormholeRegion(regionId);

  const visibleTabs: Record<RegionPageTab, boolean> = {
    overview: true,
    constellations: constellations.length > 0,
    systems: systems.length > 0,
    incursions:
      incursions.incursions.length > 0 ||
      systems.some((system) => system.siteRole !== null),
    history: true,
  };
  const selectedTab = visibleTabs[activeTab]
    ? activeTab
    : DEFAULT_REGION_PAGE_TAB;

  return (
    <Container size="lg" py="md">
      <Stack gap="lg">
        <HeroCard artwork={<ControlRegionLayoutIcon size={128} alt="" />}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            Region
          </Text>
          <Group gap="sm" align="center">
            <Title order={2}>{name}</Title>
            <ActiveIncursionBadge
              active={active}
              onClick={() => void setActiveTab("incursions")}
            />
          </Group>
          {faction && (
            <Box>
              <FactionLine faction={faction} />
            </Box>
          )}

          <Group gap="xl">
            <UniverseHeroStats
              systems={systems}
              incursionCount={incursions.incursions.length}
            >
              <HeroStat
                label="Constellations"
                value={formatInteger(constellations.length)}
              />
            </UniverseHeroStats>
          </Group>

          <Group gap="xs">
            {externalLinks(regionId, name).map((link) => (
              <Button
                key={link.label}
                component={Link}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                size="xs"
                leftSection={<IconExternalLink size={14} />}
              >
                {link.label}
              </Button>
            ))}
          </Group>
        </HeroCard>

        <Tabs
          value={selectedTab}
          onChange={(value) => {
            if (isRegionPageTab(value)) void setActiveTab(value);
          }}
          variant="outline"
          keepMounted={false}
        >
          <Tabs.List>
            <Tabs.Tab
              value="overview"
              leftSection={<WindowInfoIcon size={16} alt="" />}
            >
              Overview
            </Tabs.Tab>
            {visibleTabs.constellations && (
              <Tabs.Tab
                value="constellations"
                leftSection={
                  <ControlConstellationLayoutIcon size={16} alt="" />
                }
              >
                Constellations ({formatInteger(constellations.length)})
              </Tabs.Tab>
            )}
            {visibleTabs.systems && (
              <Tabs.Tab
                value="systems"
                leftSection={<CategorySolarSystemIcon size={16} alt="" />}
              >
                Systems ({formatInteger(systems.length)})
              </Tabs.Tab>
            )}
            {visibleTabs.incursions && (
              <Tabs.Tab
                value="incursions"
                leftSection={<IncursionsIcon size={16} alt="" />}
              >
                Incursions ({formatInteger(incursions.incursions.length)})
              </Tabs.Tab>
            )}
            <Tabs.Tab value="history" leftSection={<IconHistory size={16} />}>
              History
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview" pt="lg">
            <Stack gap="lg">
              {region.description && (
                <MailMessageViewer content={region.description} />
              )}
              <UniverseFigures
                systems={systems}
                isWormhole={isWormhole}
                wormholeClassId={region.wormholeClassId}
                neighbourCount={region.neighbours.length}
                neighbourLabel="Neighbouring regions"
              />
              <GateNeighbours
                title="Neighbouring regions"
                kind="region"
                neighbours={region.neighbours}
                systemsById={systemsById}
              />
            </Stack>
          </Tabs.Panel>

          {visibleTabs.constellations && (
            <Tabs.Panel value="constellations" pt="lg">
              <ConstellationsTable region={region} incursions={incursions} />
            </Tabs.Panel>
          )}

          {visibleTabs.systems && (
            <Tabs.Panel value="systems" pt="lg">
              <SystemsTable
                systems={systems}
                systemsById={systemsById}
                staging={staging}
                isWormhole={isWormhole}
                constellationNames={constellationNames}
              />
            </Tabs.Panel>
          )}

          {visibleTabs.incursions && (
            <Tabs.Panel value="incursions" pt="lg">
              <Stack gap="lg">
                {active.map((incursion) => (
                  <ActiveIncursionCard
                    key={incursion.incursionId}
                    incursion={incursion}
                    where={
                      <ConstellationAnchor
                        constellationId={incursion.constellationId}
                      >
                        {constellationNames.get(incursion.constellationId)}
                      </ConstellationAnchor>
                    }
                  />
                ))}
                <Text size="sm" c="dimmed">
                  Where each site spawns is on each constellation&apos;s page,
                  and in the{" "}
                  <Anchor
                    component={HoverPrefetchLink}
                    href="/incursions#layouts"
                    size="sm"
                  >
                    layouts of every constellation
                  </Anchor>
                  .
                </Text>
                <IncursionHistory
                  incursions={incursions}
                  systemsById={systemsById}
                  constellationNames={constellationNames}
                />
              </Stack>
            </Tabs.Panel>
          )}

          <Tabs.Panel value="history" pt="lg">
            <EmbeddedEntityHistory history={history} />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
