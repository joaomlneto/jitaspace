"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Anchor,
  Badge,
  Box,
  Breadcrumbs,
  Button,
  Container,
  Group,
  Image,
  Paper,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import {
  IconExternalLink,
  IconHistory,
  IconMapPin,
  IconSchool,
} from "@tabler/icons-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";

import { TypeAvatar } from "@jitaspace/eve-components";
import {
  CategoryCorporationIcon,
  WindowAgentIcon,
  WindowDirectoryServicesIcon,
  WindowInfoIcon,
  WindowReprocessingIcon,
} from "@jitaspace/eve-icons";
import { useSelectedCharacter, useStation } from "@jitaspace/hooks";
import { ISKAmount, SolarSystemSecurityStatusBadge } from "@jitaspace/ui";

import type { StationPageTab } from "./tabs";
import type {
  NamedRef,
  StationOrbit,
  StationPageData,
  StationService,
} from "./types";
import type { EntityHistoryData } from "~/lib/history-entity-page";
import {
  OpenInformationWindowActionIcon,
  SetAutopilotDestinationActionIcon,
} from "~/components/ActionIcon";
import { AgentsTable } from "~/components/Agents";
import {
  ConstellationAnchor,
  RaceAnchor,
  RegionAnchor,
  SolarSystemAnchor,
  StarAnchor,
  TypeAnchor,
} from "~/components/Anchor";
import {
  CorporationLine,
  EntityLine,
  FactionLine,
  HeroCard,
  HeroStat,
  SectionHeading,
  StatCard,
} from "~/components/EntityPage";
import { RaceName } from "~/components/Text";
import { formatCountOf, formatInteger, formatPercent } from "~/lib/format";
import { lpStorePath } from "~/lib/lpStorePath";
import { named } from "~/lib/namedRef";
import { EmbeddedEntityHistory } from "../../history/EntityHistory";
import { SERVICE, ServiceIcon } from "./serviceIcons";
import {
  DEFAULT_STATION_PAGE_TAB,
  isStationPageTab,
  STATION_PAGE_TABS,
} from "./tabs";

export interface StationPageProps {
  station: StationPageData;
  /** Null when the change history could not be read. */
  history: EntityHistoryData | null;
}

const formatVolume = (m3: number) => `${formatInteger(m3)} m³`;

/**
 * The station's figures, ESI's where it has answered. ESI is the fresher
 * source — a station can be renamed or change hands between SDE ingests, and
 * our rows only carry office rent and the docking limit once the ESI station
 * scraper has run — but it only answers in the browser. Until then the
 * server's row, which the cached HTML was rendered from, so hydration agrees.
 */
function useLiveStation(station: StationPageData) {
  const { data } = useStation(station.stationId);
  const esi = data?.data;
  const owner = named(esi?.owner ?? station.owner?.id, station.owner);
  return {
    name: esi?.name ?? station.name,
    owner,
    // The faction is the server-read owner's; drop it if ESI names another.
    faction: owner?.id === station.owner?.id ? station.faction : null,
    // Our row's race comes from the ESI station scraper, so ESI may know one
    // our row does not have yet.
    race: named(esi?.race_id ?? station.race?.id, station.race),
    reprocessingEfficiency:
      esi?.reprocessing_efficiency ?? station.reprocessingEfficiency,
    reprocessingStationsTake:
      esi?.reprocessing_stations_take ?? station.reprocessingStationsTake,
    maxDockableShipVolume:
      esi?.max_dockable_ship_volume ?? station.maxDockableShipVolume,
    officeRentalCost: esi?.office_rental_cost ?? station.officeRentalCost,
  };
}

type LiveStation = ReturnType<typeof useLiveStation>;

/** The celestial the station orbits, linked where it has a page. */
function OrbitValue({ orbit }: Readonly<{ orbit: StationOrbit }>) {
  switch (orbit.kind) {
    case "planet":
      return (
        <Anchor component={Link} href={`/planet/${orbit.id}`}>
          {orbit.name}
        </Anchor>
      );
    case "star":
      return <StarAnchor starId={orbit.id}>{orbit.name}</StarAnchor>;
    case "moon":
      return <>{orbit.name}</>;
  }
}

function orbitLabel(orbit: StationOrbit) {
  switch (orbit.kind) {
    case "moon":
      return "Orbits moon";
    case "planet":
      return "Orbits planet";
    case "star":
      return "Orbits star";
  }
}

/** What a service's card adds from this station's own figures. */
function serviceDetail(
  service: StationService,
  live: LiveStation,
): ReactNode | undefined {
  switch (service.serviceId) {
    case SERVICE.reprocessingPlant:
      return `${formatPercent(live.reprocessingEfficiency)} base yield, ${formatPercent(live.reprocessingStationsTake)} station take`;
    case SERVICE.docking:
      return live.maxDockableShipVolume === null
        ? undefined
        : `Ships up to ${formatVolume(live.maxDockableShipVolume)}`;
    case SERVICE.officeRental:
      return live.officeRentalCost === null ? undefined : (
        <Group gap={4} component="span">
          <ISKAmount span inherit amount={live.officeRentalCost} /> per month
        </Group>
      );
    case SERVICE.loyaltyPointStore:
      return live.owner ? (
        <Anchor
          component={Link}
          href={
            live.owner.name
              ? lpStorePath(live.owner.name)
              : `/lp-store/${live.owner.id}`
          }
          inherit
        >
          Browse the LP store
        </Anchor>
      ) : undefined;
    default:
      return undefined;
  }
}

function standingLabel(minimumStanding: number) {
  return `Standing ≥ ${minimumStanding.toFixed(2)}`;
}

function ServiceCard({
  service,
  live,
  faction,
}: Readonly<{
  service: StationService;
  live: LiveStation;
  faction: NamedRef | null;
}>) {
  const detail = serviceDetail(service, live);
  return (
    <Paper withBorder radius="md" p="sm">
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <ServiceIcon serviceId={service.serviceId} size={32} />
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Text fw={600} c="bright">
            {service.name}
          </Text>
          {service.description && (
            <Text size="sm" c="dimmed">
              {service.description}
            </Text>
          )}
          {detail !== undefined && (
            <Text component="div" size="sm">
              {detail}
            </Text>
          )}
          {/* The threshold is the server-read owner's faction's: without that
              faction (ESI names another owner) it may no longer apply. */}
          {service.minimumStanding !== null && faction && (
            <Group gap={6}>
              <Badge
                variant="light"
                color={service.minimumStanding > 0 ? "orange" : "gray"}
              >
                {standingLabel(service.minimumStanding)}
              </Badge>
              <Text size="xs" c="dimmed">
                with {faction.name ?? "the owner's faction"}
              </Text>
            </Group>
          )}
        </Stack>
      </Group>
    </Paper>
  );
}

/** Every service as a compact icon-and-name row, for the overview. */
function ServiceList({ services }: Readonly<{ services: StationService[] }>) {
  return (
    <Paper withBorder radius="md" p="sm">
      <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4 }} spacing="xs">
        {services.map((service) => (
          <Group key={service.serviceId} gap="xs" wrap="nowrap">
            <ServiceIcon serviceId={service.serviceId} size={20} />
            <Text size="sm">{service.name}</Text>
          </Group>
        ))}
      </SimpleGrid>
    </Paper>
  );
}

function OverviewPanel({
  station,
  live,
}: Readonly<{ station: StationPageData; live: LiveStation }>) {
  const { location, orbit, operation, agents } = station;
  const levels = [...new Set(agents.map((agent) => agent.level))].sort(
    (a, b) => a - b,
  );
  const locators = agents.filter((agent) => agent.isLocator).length;
  return (
    <Stack gap="lg">
      <Stack gap="sm">
        <SectionHeading icon={<IconMapPin size={18} />}>
          Location
        </SectionHeading>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
          {location && (
            <StatCard
              label="Solar system"
              value={
                <Group gap="xs" wrap="nowrap">
                  <SolarSystemSecurityStatusBadge
                    securityStatus={location.securityStatus}
                    size="sm"
                  />
                  <SolarSystemAnchor solarSystemId={location.solarSystem.id}>
                    {location.solarSystem.name}
                  </SolarSystemAnchor>
                </Group>
              }
              sub={
                <ConstellationAnchor
                  constellationId={location.constellation.id}
                  size="xs"
                >
                  {location.constellation.name}
                </ConstellationAnchor>
              }
            />
          )}
          {location?.region && (
            <StatCard
              label="Region"
              value={
                <RegionAnchor regionId={location.region.id}>
                  {location.region.name ?? location.region.id}
                </RegionAnchor>
              }
            />
          )}
          {orbit && (
            <StatCard
              label={orbitLabel(orbit)}
              value={<OrbitValue orbit={orbit} />}
              sub={
                orbit.planet ? (
                  <Anchor
                    component={Link}
                    href={`/planet/${orbit.planet.id}`}
                    size="xs"
                  >
                    {orbit.planet.name}
                  </Anchor>
                ) : undefined
              }
            />
          )}
          <StatCard label="Station ID" value={station.stationId} />
        </SimpleGrid>
      </Stack>

      <Stack gap="sm">
        <SectionHeading
          icon={
            <CategoryCorporationIcon size={18} color="currentColor" alt="" />
          }
        >
          Operator
        </SectionHeading>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
          {live.owner && (
            <StatCard
              label="Owner"
              value={<CorporationLine corporation={live.owner} />}
            />
          )}
          {live.faction && (
            <StatCard
              label="Faction"
              value={<FactionLine faction={live.faction} />}
            />
          )}
          {live.race && (
            <StatCard
              label="Race"
              value={
                <RaceAnchor raceId={live.race.id}>
                  {live.race.name ?? <RaceName span raceId={live.race.id} />}
                </RaceAnchor>
              }
            />
          )}
          <StatCard
            label="Station type"
            value={
              <EntityLine
                avatar={<TypeAvatar typeId={station.type.id} size="sm" />}
              >
                <TypeAnchor typeId={station.type.id}>
                  {station.type.name ?? station.type.id}
                </TypeAnchor>
              </EntityLine>
            }
          />
          {operation && (
            <StatCard
              label="Operation"
              value={operation.name}
              sub={operation.activity?.name ?? undefined}
            />
          )}
          {station.headquarters.length > 0 && (
            <StatCard
              label="Headquarters of"
              value={
                <Stack gap={4}>
                  {station.headquarters.map((corporation) => (
                    <CorporationLine
                      key={corporation.id}
                      corporation={corporation}
                    />
                  ))}
                </Stack>
              }
            />
          )}
        </SimpleGrid>
      </Stack>

      <Stack gap="sm">
        <SectionHeading icon={<WindowReprocessingIcon size={18} alt="" />}>
          Facilities
        </SectionHeading>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="sm">
          <StatCard
            label="Reprocessing efficiency"
            value={formatPercent(live.reprocessingEfficiency)}
            sub="Base yield, before skills"
          />
          <StatCard
            label="Station's take"
            value={formatPercent(live.reprocessingStationsTake)}
            sub="Of reprocessed output"
          />
          {live.maxDockableShipVolume !== null && (
            <StatCard
              label="Max dockable ship"
              value={formatVolume(live.maxDockableShipVolume)}
            />
          )}
          {live.officeRentalCost !== null && (
            <StatCard
              label="Office rent"
              value={<ISKAmount span inherit amount={live.officeRentalCost} />}
              sub="Per month"
            />
          )}
        </SimpleGrid>
      </Stack>

      {station.services.length > 0 && (
        <Stack gap="sm">
          <SectionHeading
            icon={<WindowDirectoryServicesIcon size={18} alt="" />}
          >
            Services
          </SectionHeading>
          <ServiceList services={station.services} />
        </Stack>
      )}

      {agents.length > 0 && (
        <Stack gap="sm">
          <SectionHeading icon={<WindowAgentIcon size={18} alt="" />}>
            Agents
          </SectionHeading>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            <StatCard
              label="Agents"
              value={formatInteger(agents.length)}
              sub={
                locators > 0
                  ? formatCountOf(locators, "locator", "locators")
                  : undefined
              }
            />
            <StatCard
              label={levels.length === 1 ? "Level" : "Levels"}
              value={levels.map((level) => `L${level}`).join(", ")}
            />
            <StatCard
              label="Divisions"
              value={station.agentDivisions
                .map((division) => division.name)
                .sort((a, b) => a.localeCompare(b))
                .join(", ")}
            />
          </SimpleGrid>
        </Stack>
      )}

      {station.schools.length > 0 && (
        <Stack gap="sm">
          <SectionHeading icon={<IconSchool size={18} />}>
            Starting station
          </SectionHeading>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
            {station.schools.map((school) => (
              <StatCard
                key={school.schoolId}
                label="School"
                value={school.name}
                sub={
                  school.race ? (
                    <RaceAnchor raceId={school.race.id} size="xs">
                      {school.race.name ?? school.race.id}
                    </RaceAnchor>
                  ) : undefined
                }
              />
            ))}
          </SimpleGrid>
        </Stack>
      )}
    </Stack>
  );
}

function ServicesPanel({
  station,
  live,
}: Readonly<{ station: StationPageData; live: LiveStation }>) {
  const { operation } = station;
  return (
    <Stack gap="lg">
      {operation && (
        <Stack gap="sm">
          <SectionHeading icon={<WindowInfoIcon size={18} alt="" />}>
            {operation.name}
          </SectionHeading>
          {operation.description && (
            <Text size="sm" c="dimmed">
              {operation.description}
            </Text>
          )}
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            {operation.activity && (
              <StatCard label="Activity" value={operation.activity.name} />
            )}
            <StatCard
              label="Manufacturing factor"
              value={`×${operation.manufacturingFactor.toFixed(2)}`}
            />
            <StatCard
              label="Research factor"
              value={`×${operation.researchFactor.toFixed(2)}`}
            />
          </SimpleGrid>
        </Stack>
      )}
      <Stack gap="sm">
        <SectionHeading icon={<WindowDirectoryServicesIcon size={18} alt="" />}>
          Services
        </SectionHeading>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
          {station.services.map((service) => (
            <ServiceCard
              key={service.serviceId}
              service={service}
              live={live}
              faction={live.faction}
            />
          ))}
        </SimpleGrid>
      </Stack>
    </Stack>
  );
}

export default function StationPage({
  station,
  history,
}: Readonly<StationPageProps>) {
  const { stationId, location } = station;
  const selectedCharacter = useSelectedCharacter();
  const live = useLiveStation(station);
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsStringLiteral(STATION_PAGE_TABS)
      .withDefault(DEFAULT_STATION_PAGE_TAB)
      .withOptions({ history: "replace" }),
  );

  const visibleTabs: Record<StationPageTab, boolean> = {
    overview: true,
    services: station.services.length > 0,
    agents: station.agents.length > 0,
    history: true,
  };
  const selectedTab = visibleTabs[activeTab]
    ? activeTab
    : DEFAULT_STATION_PAGE_TAB;

  return (
    <Container size="lg" py="md">
      <Stack gap="lg">
        <HeroCard
          artwork={
            <Image
              src={`https://images.evetech.net/types/${station.type.id}/render?size=512`}
              alt={station.type.name ?? `Station type ${station.type.id}`}
              w={170}
              h={170}
              fit="cover"
            />
          }
        >
          {location && (
            <Breadcrumbs fz="sm">
              {location.region && (
                <RegionAnchor regionId={location.region.id} size="sm">
                  {location.region.name ?? location.region.id}
                </RegionAnchor>
              )}
              <ConstellationAnchor
                constellationId={location.constellation.id}
                size="sm"
              >
                {location.constellation.name}
              </ConstellationAnchor>
              <SolarSystemAnchor
                solarSystemId={location.solarSystem.id}
                size="sm"
              >
                {location.solarSystem.name}
              </SolarSystemAnchor>
            </Breadcrumbs>
          )}
          {station.operation && (
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
              {station.operation.name}
            </Text>
          )}
          <Group gap="sm" align="center">
            <Title order={1} size="h2">
              {live.name}
            </Title>
            {location && (
              <SolarSystemSecurityStatusBadge
                securityStatus={location.securityStatus}
              />
            )}
            {selectedCharacter && (
              <>
                <SetAutopilotDestinationActionIcon
                  characterId={selectedCharacter.characterId}
                  destinationId={stationId}
                />
                <OpenInformationWindowActionIcon
                  characterId={selectedCharacter.characterId}
                  entityId={stationId}
                />
              </>
            )}
          </Group>
          {live.owner && (
            <Box>
              <CorporationLine corporation={live.owner} />
            </Box>
          )}

          <Group gap="xl">
            <HeroStat
              label="Services"
              value={formatInteger(station.services.length)}
            />
            <HeroStat
              label="Agents"
              value={formatInteger(station.agents.length)}
            />
            <HeroStat
              label="Reprocessing"
              value={formatPercent(live.reprocessingEfficiency)}
            />
            {live.officeRentalCost !== null && (
              <HeroStat
                label="Office rent"
                value={
                  <ISKAmount span inherit amount={live.officeRentalCost} />
                }
              />
            )}
          </Group>

          <Group gap="xs">
            <Button
              component={Link}
              href={`https://evemaps.dotlan.net/station/${stationId}`}
              target="_blank"
              rel="noopener noreferrer"
              size="xs"
              leftSection={<IconExternalLink size={14} />}
            >
              DOTLAN EveMaps
            </Button>
          </Group>
        </HeroCard>

        <Tabs
          value={selectedTab}
          onChange={(value) => {
            if (isStationPageTab(value)) void setActiveTab(value);
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
            {visibleTabs.services && (
              <Tabs.Tab
                value="services"
                leftSection={<WindowDirectoryServicesIcon size={16} alt="" />}
              >
                Services ({formatInteger(station.services.length)})
              </Tabs.Tab>
            )}
            {visibleTabs.agents && (
              <Tabs.Tab
                value="agents"
                leftSection={<WindowAgentIcon size={16} alt="" />}
              >
                Agents ({formatInteger(station.agents.length)})
              </Tabs.Tab>
            )}
            <Tabs.Tab value="history" leftSection={<IconHistory size={16} />}>
              History
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview" pt="lg">
            <OverviewPanel station={station} live={live} />
          </Tabs.Panel>

          {visibleTabs.services && (
            <Tabs.Panel value="services" pt="lg">
              <ServicesPanel station={station} live={live} />
            </Tabs.Panel>
          )}

          {visibleTabs.agents && (
            <Tabs.Panel value="agents" pt="lg">
              <AgentsTable
                agents={station.agents}
                agentTypes={station.agentTypes}
                agentDivisions={station.agentDivisions}
                withLocation={false}
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
