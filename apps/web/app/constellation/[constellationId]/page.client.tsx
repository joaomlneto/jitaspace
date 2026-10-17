"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Box,
  Breadcrumbs,
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

import {
  CategorySolarSystemIcon,
  ControlConstellationLayoutIcon,
  IncursionsIcon,
  WindowInfoIcon,
} from "@jitaspace/eve-icons";

import type { ConstellationPageTab } from "./tabs";
import type { ConstellationIncursions, ConstellationPageData } from "./types";
import type { SystemsById } from "~/components/UniversePage/types";
import type { EntityHistoryData } from "~/lib/history-entity-page";
import { RegionAnchor } from "~/components/Anchor";
import { FactionLine, HeroCard } from "~/components/EntityPage";
import {
  ActiveIncursionBadge,
  activeIncursions,
  GateNeighbours,
  isWormholeRegion,
  latestStagingByConstellation,
  SystemsTable,
  UniverseFigures,
  UniverseHeroStats,
} from "~/components/UniversePage";
import { formatInteger } from "~/lib/format";
import { EmbeddedEntityHistory } from "../../history/EntityHistory";
import { hasIncursionData, IncursionsPanel } from "./IncursionsPanel";
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

const dotlanName = (name: string) =>
  encodeURIComponent(name.replaceAll(" ", "_"));

export default function ConstellationPage({
  constellation,
  incursions,
  history,
}: Readonly<ConstellationPageProps>) {
  const { constellationId, name, region, faction, systems } = constellation;
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
  const staging =
    latestStagingByConstellation(incursions.incursions).get(constellationId) ??
    null;
  const stagingSet = useMemo(
    () => new Set(staging === null ? [] : [staging]),
    [staging],
  );
  const isWormhole = isWormholeRegion(region?.id);

  const visibleTabs: Record<ConstellationPageTab, boolean> = {
    overview: true,
    systems: systems.length > 0,
    incursions: hasIncursionData(systems, incursions),
    history: true,
  };
  const selectedTab = visibleTabs[activeTab]
    ? activeTab
    : DEFAULT_CONSTELLATION_PAGE_TAB;

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
            <ActiveIncursionBadge
              active={activeIncursions(incursions)}
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
            />
          </Group>

          {region?.name && (
            <Group gap="xs">
              <Button
                component={Link}
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
            <Stack gap="lg">
              <UniverseFigures
                systems={systems}
                isWormhole={isWormhole}
                wormholeClassId={constellation.wormholeClassId}
                neighbourCount={constellation.neighbours.length}
                neighbourLabel="Neighbouring constellations"
              />
              <GateNeighbours
                title="Neighbouring constellations"
                kind="constellation"
                neighbours={constellation.neighbours}
                systemsById={systemsById}
                regionId={region?.id}
              />
            </Stack>
          </Tabs.Panel>

          {visibleTabs.systems && (
            <Tabs.Panel value="systems" pt="lg">
              <SystemsTable
                systems={systems}
                systemsById={systemsById}
                staging={stagingSet}
                isWormhole={isWormhole}
              />
            </Tabs.Panel>
          )}

          {visibleTabs.incursions && (
            <Tabs.Panel value="incursions" pt="lg">
              <IncursionsPanel
                systems={systems}
                systemsById={systemsById}
                incursions={incursions}
                staging={staging}
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
