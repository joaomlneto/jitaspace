"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Anchor,
  Badge,
  Button,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import type { GetIndustrySystemsQueryResponse } from "@jitaspace/esi-client";
import { IndustryIcon } from "@jitaspace/eve-icons";
import {
  useSelectedCharacter,
  useSolarSystem,
  useSolarSystemCostIndices,
  useSolarSystemSovereignty,
} from "@jitaspace/hooks";
import {
  useGetConstellationById,
  useGetSolarSystemById,
} from "@jitaspace/sde-client";
import {
  AllianceAnchor,
  AllianceAvatar,
  AllianceName,
  CorporationAnchor,
  CorporationAvatar,
  CorporationName,
  FactionAnchor,
  FactionAvatar,
  FactionName,
  Position3DText,
  SolarSystemName,
  SolarSystemSovereigntyAvatar,
  StarAnchor,
  StationAnchor,
  StationName,
  TypeAvatar,
} from "@jitaspace/ui";

import { SetAutopilotDestinationActionIcon } from "~/components/ActionIcon";
import { StargateDestinationAnchor } from "~/components/Anchor";
import {
  PlanetAvatar,
  StarAvatar,
  StargateAvatar,
  StationAvatar,
} from "~/components/Avatar";
import { SolarSystemSecurityStatusBadge } from "~/components/Badge";
import { SolarSystemBreadcrumbs } from "~/components/Breadcrumbs";
import { PlanetName, StargateName, StarName } from "~/components/Text";
import { StatsGrid } from "~/components/UI";

const MOON_TYPE_ID = 14;
const ASTEROID_BELT_TYPE_ID = 15;

// Known wormhole class IDs. k-space classes (high/low/null) are intentionally
// omitted so we only surface this for actual wormhole / Drifter space.
const WORMHOLE_CLASS_NAMES: Record<number, string> = {
  1: "C1",
  2: "C2",
  3: "C3",
  4: "C4",
  5: "C5",
  6: "C6",
  12: "Thera",
  13: "C13 · Shattered",
  14: "Sentinel",
  15: "Barbican",
  16: "Vidette",
  17: "Conflux",
  18: "Redoubt",
};

export default function Page() {
  const params = useParams();
  const rawSystemId = params.systemId;
  const systemId = Number(
    typeof rawSystemId === "string" ? rawSystemId : rawSystemId?.[0],
  );
  const character = useSelectedCharacter();
  const { data: solarSystem } = useSolarSystem(systemId);
  const { data: sdeSolarSystem } = useGetSolarSystemById(systemId);
  const { data: sdeConstellation } = useGetConstellationById(
    solarSystem?.data.constellation_id ?? 0,
  );
  const { data: solarSystemCostIndicesData } = useSolarSystemCostIndices();

  if (!Number.isFinite(systemId)) {
    return null;
  }

  const data = solarSystem?.data;
  const sde = sdeSolarSystem?.data;

  const planets = data?.planets ?? [];
  const stargates = data?.stargates ?? [];
  const stations = data?.stations ?? [];
  const moonCount = planets.reduce(
    (acc, planet) => acc + (planet.moons?.length ?? 0),
    0,
  );
  const beltCount = planets.reduce(
    (acc, planet) => acc + (planet.asteroid_belts?.length ?? 0),
    0,
  );

  // Wormhole class lives on the system for Drifter holes (14-18) and on the
  // constellation for regular wormhole space (C1-C6, Thera, shattered).
  const wormholeClassId =
    sde?.wormholeClassID ?? sdeConstellation?.data.wormholeClassID;
  const wormholeClassName = wormholeClassId
    ? WORMHOLE_CLASS_NAMES[wormholeClassId]
    : undefined;

  const classifications = [
    { label: "Trade Hub", active: sde?.hub },
    { label: "Border", active: sde?.border },
    { label: "Fringe", active: sde?.fringe },
    { label: "Corridor", active: sde?.corridor },
    { label: "International", active: sde?.international },
    { label: "Regional", active: sde?.regional },
  ].filter((classification) => classification.active);

  const externalResources = [
    {
      label: "DOTLAN EveMaps",
      href: `https://evemaps.dotlan.net/system/${systemId}`,
    },
    { label: "zKillboard", href: `https://zkillboard.com/system/${systemId}` },
    { label: "Eveeye", href: `https://eveeye.com/?s=${systemId}` },
    {
      label: "Adam4EVE",
      href: `https://www.adam4eve.eu/location.php?id=${systemId}`,
    },
  ];

  const costIndicesEntry: GetIndustrySystemsQueryResponse[number] | undefined =
    solarSystemCostIndicesData[systemId];
  const costIndices = costIndicesEntry?.cost_indices ?? [];

  const positionData = sde?.position;
  const position =
    positionData?.x !== undefined &&
    positionData.y !== undefined &&
    positionData.z !== undefined
      ? [positionData.x, positionData.y, positionData.z]
      : undefined;

  return (
    <Container size="md" py="md">
      <Stack gap="lg">
        {/* Header */}
        <Paper p="lg" radius="md" withBorder>
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Group align="flex-start" wrap="nowrap" gap="md">
              <SolarSystemSovereigntyAvatar
                solarSystemId={systemId}
                size={72}
                radius="md"
              />
              <Stack gap={6}>
                <Group gap="sm" align="center">
                  <Title order={2}>
                    <SolarSystemName span solarSystemId={systemId} />
                  </Title>
                  <SolarSystemSecurityStatusBadge
                    solarSystemId={systemId}
                    size="lg"
                  />
                  {character && (
                    <SetAutopilotDestinationActionIcon
                      characterId={character.characterId}
                      destinationId={systemId}
                    />
                  )}
                </Group>
                <SolarSystemBreadcrumbs
                  solarSystemId={systemId}
                  hideSolarSystem
                  textProps={{ size: "sm" }}
                />
                <SovereigntyOwner solarSystemId={systemId} />
              </Stack>
            </Group>
          </Group>
          {wormholeClassName && (
            <Group gap="xs" mt="md">
              <Badge color="violet" variant="light">
                Wormhole · {wormholeClassName}
              </Badge>
            </Group>
          )}
        </Paper>

        {/* Summary statistics */}
        <SimpleGrid cols={{ base: 2, xs: 3, sm: 6 }} spacing="xs">
          <StatCard
            label="Security"
            loading={!data}
            value={data ? data.security_status.toFixed(2) : "—"}
          />
          <StatCard label="Planets" loading={!data} value={planets.length} />
          <StatCard label="Moons" loading={!data} value={moonCount} />
          <StatCard label="Belts" loading={!data} value={beltCount} />
          <StatCard
            label="Stargates"
            loading={!data}
            value={stargates.length}
          />
          <StatCard label="Stations" loading={!data} value={stations.length} />
        </SimpleGrid>

        {/* External resources */}
        <Group gap="xs">
          {externalResources.map((resource) => (
            <Button
              key={resource.label}
              component={Link}
              href={resource.href}
              target="_blank"
              size="xs"
              leftSection={<IconExternalLink size={14} />}
            >
              {resource.label}
            </Button>
          ))}
        </Group>

        {/* Stargates */}
        {stargates.length > 0 && (
          <SectionCard title="Stargates" count={stargates.length}>
            <Stack gap="xs">
              {stargates.map((stargateId) => (
                <Group key={stargateId} gap="xs" wrap="nowrap">
                  <StargateAvatar size="sm" stargateId={stargateId} />
                  <StargateDestinationAnchor stargateId={stargateId}>
                    <StargateName span stargateId={stargateId} />
                  </StargateDestinationAnchor>
                </Group>
              ))}
            </Stack>
          </SectionCard>
        )}

        {/* Stations */}
        {stations.length > 0 && (
          <SectionCard title="Stations" count={stations.length}>
            <Stack gap="xs">
              {stations.map((stationId) => (
                <Group key={stationId} gap="xs" wrap="nowrap">
                  <StationAvatar size="sm" stationId={stationId} />
                  <StationAnchor stationId={stationId}>
                    <StationName span stationId={stationId} />
                  </StationAnchor>
                </Group>
              ))}
            </Stack>
          </SectionCard>
        )}

        {/* Celestials */}
        {(data?.star_id !== undefined || planets.length > 0) && (
          <SectionCard title="Celestials" count={planets.length || undefined}>
            <Stack gap="xs">
              {data?.star_id && (
                <Group gap="xs" wrap="nowrap">
                  <StarAvatar starId={data.star_id} size="sm" />
                  <StarAnchor starId={data.star_id}>
                    <StarName span starId={data.star_id} />
                  </StarAnchor>
                </Group>
              )}
              {planets.map((planet) => (
                <Group key={planet.planet_id} gap="md" wrap="nowrap">
                  <Group gap="xs" wrap="nowrap">
                    <PlanetAvatar planetId={planet.planet_id} size="sm" />
                    <Anchor
                      component={Link}
                      href={`/planet/${planet.planet_id}`}
                    >
                      <PlanetName span planetId={planet.planet_id} />
                    </Anchor>
                  </Group>
                  <Group gap="md" wrap="nowrap">
                    {!!planet.moons?.length && (
                      <Tooltip
                        label={`${planet.moons.length} ${planet.moons.length === 1 ? "moon" : "moons"}`}
                      >
                        <Group gap={4} wrap="nowrap">
                          <TypeAvatar typeId={MOON_TYPE_ID} size="xs" />
                          <Text size="xs" c="dimmed">
                            {planet.moons.length}
                          </Text>
                        </Group>
                      </Tooltip>
                    )}
                    {!!planet.asteroid_belts?.length && (
                      <Tooltip
                        label={`${planet.asteroid_belts.length} asteroid ${planet.asteroid_belts.length === 1 ? "belt" : "belts"}`}
                      >
                        <Group gap={4} wrap="nowrap">
                          <TypeAvatar
                            typeId={ASTEROID_BELT_TYPE_ID}
                            size="xs"
                          />
                          <Text size="xs" c="dimmed">
                            {planet.asteroid_belts.length}
                          </Text>
                        </Group>
                      </Tooltip>
                    )}
                  </Group>
                </Group>
              ))}
            </Stack>
          </SectionCard>
        )}

        {/* Industry cost indices */}
        {costIndices.length > 0 && (
          <SectionCard title="Industry Cost Indices">
            <StatsGrid
              cols={{ base: 1, xs: 2, sm: 3 }}
              spacing="xs"
              data={costIndices.map((index) => ({
                icon: (props) => <IndustryIcon {...props} />,
                title: index.activity.replaceAll("_", " "),
                value: `${(index.cost_index * 100).toFixed(2)}%`,
              }))}
            />
          </SectionCard>
        )}

        {/* System details */}
        <SectionCard title="System Details">
          <Stack gap="xs">
            {data && (
              <DetailRow
                label="Security Status"
                value={data.security_status.toFixed(4)}
              />
            )}
            {data?.security_class && (
              <DetailRow label="Security Class" value={data.security_class} />
            )}
            {typeof sde?.luminosity === "number" && (
              <DetailRow label="Luminosity" value={sde.luminosity.toString()} />
            )}
            {!!sde?.radius && (
              <DetailRow
                label="Radius"
                value={`${sde.radius.toLocaleString()} m`}
              />
            )}
            {classifications.length > 0 && (
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Text size="sm" c="dimmed">
                  Classifications
                </Text>
                <Group gap="xs" justify="flex-end">
                  {classifications.map((classification) => (
                    <Badge key={classification.label} variant="light" size="sm">
                      {classification.label}
                    </Badge>
                  ))}
                </Group>
              </Group>
            )}
            <Group justify="space-between" wrap="nowrap">
              <Text size="sm" c="dimmed">
                Position
              </Text>
              <Position3DText size="xs" position={position} />
            </Group>
          </Stack>
        </SectionCard>
      </Stack>
    </Container>
  );
}

function StatCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: ReactNode;
  loading?: boolean;
}) {
  return (
    <Paper p="xs" radius="md" withBorder>
      <Text
        size="0.65rem"
        fw={700}
        tt="uppercase"
        c="dimmed"
        style={{ letterSpacing: "0.05em" }}
      >
        {label}
      </Text>
      <Skeleton visible={!!loading} mt={4} width={loading ? "60%" : undefined}>
        <Text fz="1.5rem" fw={700} lh={1.1}>
          {value}
        </Text>
      </Skeleton>
    </Paper>
  );
}

function SectionCard({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <Paper p="md" radius="md" withBorder>
      <Group gap="xs" mb="sm">
        <Title order={4}>{title}</Title>
        {count !== undefined && (
          <Badge variant="light" color="gray" size="sm">
            {count}
          </Badge>
        )}
      </Group>
      {children}
    </Paper>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Group justify="space-between" wrap="nowrap">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm">{value}</Text>
    </Group>
  );
}

function OwnerLine({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Group gap={6} wrap="nowrap">
      <Text size="xs" c="dimmed" tt="uppercase">
        {label}
      </Text>
      {children}
    </Group>
  );
}

function SovereigntyOwner({ solarSystemId }: { solarSystemId: number }) {
  const sovereignty = useSolarSystemSovereignty(solarSystemId);

  if (sovereignty?.alliance_id) {
    return (
      <OwnerLine label="Sovereignty">
        <AllianceAvatar allianceId={sovereignty.alliance_id} size="sm" />
        <AllianceAnchor allianceId={sovereignty.alliance_id}>
          <AllianceName span size="sm" allianceId={sovereignty.alliance_id} />
        </AllianceAnchor>
      </OwnerLine>
    );
  }

  if (sovereignty?.corporation_id) {
    return (
      <OwnerLine label="Sovereignty">
        <CorporationAvatar
          corporationId={sovereignty.corporation_id}
          size="sm"
        />
        <CorporationAnchor corporationId={sovereignty.corporation_id}>
          <CorporationName
            span
            size="sm"
            corporationId={sovereignty.corporation_id}
          />
        </CorporationAnchor>
      </OwnerLine>
    );
  }

  if (sovereignty?.faction_id) {
    return (
      <OwnerLine label="Faction">
        <FactionAvatar factionId={sovereignty.faction_id} size="sm" />
        <FactionAnchor factionId={sovereignty.faction_id}>
          <FactionName span size="sm" factionId={sovereignty.faction_id} />
        </FactionAnchor>
      </OwnerLine>
    );
  }

  return null;
}
