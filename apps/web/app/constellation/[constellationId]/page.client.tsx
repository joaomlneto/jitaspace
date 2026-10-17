"use client";

import { useMemo } from "react";
import {
  Badge,
  Box,
  Breadcrumbs,
  Button,
  Container,
  Group,
  Paper,
  SimpleGrid,
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
  ControlJumpGateLayoutIcon,
  IncursionsIcon,
  WindowInfoIcon,
} from "@jitaspace/eve-icons";
import {
  securityStatusBand,
  SolarSystemSecurityStatusBadge,
} from "@jitaspace/ui";

import type { SystemsById } from "./parts";
import type { ConstellationPageTab } from "./tabs";
import type {
  ConstellationIncursions,
  ConstellationPageData,
  ConstellationSystem,
} from "./types";
import type { EntityHistoryData } from "~/lib/history-entity-page";
import { STATE_COLOR, STATE_LABEL } from "~/app/incursions/parts";
import { ConstellationAnchor, RegionAnchor } from "~/components/Anchor";
import { DataTable } from "~/components/DataTable";
import {
  FactionLine,
  HeroCard,
  HeroStat,
  SectionHeading,
  StatCard,
} from "~/components/EntityPage";
import { HoverPrefetchLink } from "~/components/Link";
import { formatInteger } from "~/lib/format";
import { EmbeddedEntityHistory } from "../../history/EntityHistory";
import {
  hasIncursionData,
  IncursionsPanel,
  latestStaging,
} from "./IncursionsPanel";
import { SystemLink } from "./parts";
import {
  CONSTELLATION_PAGE_TABS,
  DEFAULT_CONSTELLATION_PAGE_TAB,
  isConstellationPageTab,
} from "./tabs";

export interface ConstellationPageProps {
  constellation: ConstellationPageData;
  incursions: ConstellationIncursions;
  /** Null when the change history could not be read. */
  history: EntityHistoryData | null;
}

const SITE_LABEL = {
  staging: "Staging",
  vanguard: "Vanguard",
  assault: "Assault",
  headquarters: "Headquarters",
} as const;

/** Wormhole space: its regions start at 11000000. */
const isWormholeSpace = (constellation: ConstellationPageData) =>
  (constellation.region?.id ?? 0) >= 11_000_000;

/** A system's security band, or "Wormhole" in wormhole space. */
const bandOf = (system: ConstellationSystem, isWormhole: boolean) =>
  isWormhole ? "Wormhole" : securityStatusBand(system.securityStatus);

const dotlanName = (name: string) =>
  encodeURIComponent(name.replaceAll(" ", "_"));

/** Lowest and highest security, as badges. */
function SecurityRange({
  systems,
}: Readonly<{ systems: readonly ConstellationSystem[] }>) {
  const values = systems.map((system) => system.securityStatus);
  if (values.length === 0) return <>—</>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  return (
    <Group gap={6} wrap="nowrap" component="span">
      <SolarSystemSecurityStatusBadge securityStatus={min} size="sm" />
      {max !== min && (
        <>
          –
          <SolarSystemSecurityStatusBadge securityStatus={max} size="sm" />
        </>
      )}
    </Group>
  );
}

function OverviewPanel({
  constellation,
  systemsById,
}: Readonly<{
  constellation: ConstellationPageData;
  systemsById: SystemsById;
}>) {
  const { systems, neighbours } = constellation;
  const stations = systems.reduce((sum, s) => sum + s.stationCount, 0);
  const bands = new Map<string, number>();
  for (const system of systems) {
    const band = bandOf(system, isWormholeSpace(constellation));
    bands.set(band, (bands.get(band) ?? 0) + 1);
  }
  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="sm">
        <StatCard
          label="Solar systems"
          value={formatInteger(systems.length)}
          sub={[...bands].map(([band, n]) => `${n} ${band}`).join(", ")}
        />
        <StatCard
          label="Security"
          value={<SecurityRange systems={systems} />}
        />
        <StatCard label="Stations" value={formatInteger(stations)} />
        {/* The SDE gives known space a wormhole class too (7 high-sec, 8
            low-sec, 9 null-sec: what spawns there), so only show it for
            wormhole space. */}
        {constellation.wormholeClassId !== null &&
        isWormholeSpace(constellation) ? (
          <StatCard
            label="Wormhole class"
            value={
              constellation.wormholeClassId <= 6
                ? `C${constellation.wormholeClassId}`
                : String(constellation.wormholeClassId)
            }
          />
        ) : (
          <StatCard
            label="Neighbouring constellations"
            value={formatInteger(neighbours.length)}
          />
        )}
      </SimpleGrid>

      {neighbours.length > 0 && (
        <Stack gap="sm">
          <SectionHeading icon={<ControlJumpGateLayoutIcon size={18} alt="" />}>
            Neighbouring constellations
          </SectionHeading>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
            {neighbours.map((neighbour) => (
              <Paper
                key={neighbour.constellationId}
                withBorder
                radius="md"
                p="sm"
              >
                <Stack gap={4}>
                  <Group gap={6} justify="space-between" wrap="nowrap">
                    <ConstellationAnchor
                      constellationId={neighbour.constellationId}
                      fw={600}
                    >
                      {neighbour.name}
                    </ConstellationAnchor>
                    {neighbour.region &&
                      neighbour.region.id !== constellation.region?.id && (
                        <RegionAnchor
                          regionId={neighbour.region.id}
                          size="xs"
                          c="dimmed"
                        >
                          {neighbour.region.name ?? neighbour.region.id}
                        </RegionAnchor>
                      )}
                  </Group>
                  {neighbour.gates.map(([here, there]) => (
                    <Text key={`${here.id}-${there.id}`} size="xs" c="dimmed">
                      {systemsById.get(here.id)?.name ?? here.name} →{" "}
                      {there.name}
                    </Text>
                  ))}
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
        </Stack>
      )}
    </Stack>
  );
}

interface SystemRow extends ConstellationSystem {
  band: string;
  site: string | null;
}

const systemColumnsFor = (
  systemsById: SystemsById,
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

function SystemsPanel({
  systems,
  systemsById,
  staging,
  isWormhole,
}: Readonly<{
  systems: readonly ConstellationSystem[];
  systemsById: SystemsById;
  staging: number | null;
  isWormhole: boolean;
}>) {
  const rows = useMemo<SystemRow[]>(
    () =>
      systems.map((system) => {
        const role =
          system.solarSystemId === staging ? "staging" : system.siteRole;
        return {
          ...system,
          band: bandOf(system, isWormhole),
          site: role ? SITE_LABEL[role] : null,
        };
      }),
    [systems, staging, isWormhole],
  );
  const columns = useMemo(() => systemColumnsFor(systemsById), [systemsById]);
  return (
    <DataTable
      data={rows}
      columns={columns}
      rowId={(row) => row.solarSystemId}
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

export default function ConstellationPage({
  constellation,
  incursions,
  history,
}: Readonly<ConstellationPageProps>) {
  const { name, region, faction, systems } = constellation;
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsStringLiteral(CONSTELLATION_PAGE_TABS)
      .withDefault(DEFAULT_CONSTELLATION_PAGE_TAB)
      .withOptions({ history: "replace" }),
  );
  const systemsById = useMemo<SystemsById>(
    () => new Map(systems.map((system) => [system.solarSystemId, system])),
    [systems],
  );

  const visibleTabs: Record<ConstellationPageTab, boolean> = {
    overview: true,
    systems: systems.length > 0,
    incursions: hasIncursionData(systems, incursions),
    history: true,
  };
  const selectedTab = visibleTabs[activeTab]
    ? activeTab
    : DEFAULT_CONSTELLATION_PAGE_TAB;
  const active = incursions.incursions.find((i) => i.endedAt === null);
  const staging = latestStaging(incursions.incursions);

  return (
    <Container size="lg" py="md">
      <Stack gap="lg">
        <HeroCard
          artwork={<ControlConstellationLayoutIcon size={128} alt="" />}
        >
          {region && (
            <Breadcrumbs fz="sm">
              <RegionAnchor regionId={region.id} size="sm">
                {region.name ?? region.id}
              </RegionAnchor>
            </Breadcrumbs>
          )}
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            Constellation
          </Text>
          <Group gap="sm" align="center">
            <Title order={2}>{name}</Title>
            {active && (
              <Badge
                component="button"
                type="button"
                variant="light"
                color={STATE_COLOR[active.state]}
                leftSection={<IncursionsIcon size={14} alt="" />}
                style={{ cursor: "pointer" }}
                onClick={() => void setActiveTab("incursions")}
              >
                Incursion: {STATE_LABEL[active.state]}
              </Badge>
            )}
          </Group>
          {faction && (
            <Box>
              <FactionLine faction={faction} />
            </Box>
          )}

          <Group gap="xl">
            <HeroStat label="Systems" value={formatInteger(systems.length)} />
            <HeroStat
              label="Security"
              value={<SecurityRange systems={systems} />}
            />
            <HeroStat
              label="Stations"
              value={formatInteger(
                systems.reduce((sum, s) => sum + s.stationCount, 0),
              )}
            />
            {incursions.incursions.length > 0 && (
              <HeroStat
                label="Incursions"
                value={formatInteger(incursions.incursions.length)}
              />
            )}
          </Group>

          {region?.name && (
            <Group gap="xs">
              <Button
                component={HoverPrefetchLink}
                href={`https://evemaps.dotlan.net/map/${dotlanName(region.name)}/${dotlanName(name)}`}
                target="_blank"
                rel="noopener noreferrer"
                size="xs"
                leftSection={<IconExternalLink size={14} />}
              >
                DOTLAN EveMaps
              </Button>
            </Group>
          )}
        </HeroCard>

        <Tabs
          value={selectedTab}
          onChange={(value) => {
            if (isConstellationPageTab(value)) void setActiveTab(value);
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
            <OverviewPanel
              constellation={constellation}
              systemsById={systemsById}
            />
          </Tabs.Panel>

          {visibleTabs.systems && (
            <Tabs.Panel value="systems" pt="lg">
              <SystemsPanel
                systems={systems}
                systemsById={systemsById}
                staging={staging}
                isWormhole={isWormholeSpace(constellation)}
              />
            </Tabs.Panel>
          )}

          {visibleTabs.incursions && (
            <Tabs.Panel value="incursions" pt="lg">
              <IncursionsPanel
                systems={systems}
                systemsById={systemsById}
                incursions={incursions}
              />
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
