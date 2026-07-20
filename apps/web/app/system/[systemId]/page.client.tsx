"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Anchor,
  Badge,
  Button,
  Container,
  Group,
  Paper,
  Progress,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconChevronRight,
  IconExternalLink,
  IconMeteor,
  IconMoon,
  IconRobot,
  IconRocket,
  IconShieldHalf,
  IconSkull,
  IconSwords,
} from "@tabler/icons-react";

import type { SolarSystem } from "@jitaspace/sde-client";
import {
  AllianceName,
  CorporationName,
  FactionName,
  SolarSystemName,
  SolarSystemSovereigntyAvatar,
  StationAnchor,
  StationName,
} from "@jitaspace/eve-components";
import { useGetFwSystems, useGetIncursions } from "@jitaspace/esi-client";
import {
  useAllSolarSystemJumps,
  useAllSolarSystemKills,
  useSelectedCharacter,
  useSolarSystem,
  useSolarSystemCostIndices,
  useSolarSystemSovereignty,
  useStar,
  useStargate,
} from "@jitaspace/hooks";
import { useGetSolarSystemById } from "@jitaspace/sde-client";
import {
  FactionAvatar,
  formatSecurityStatus,
  isLightSecurityStatus,
  Position3DText,
  securityStatusBand,
  securityStatusColor,
} from "@jitaspace/ui";

import { SetAutopilotDestinationActionIcon } from "~/components/ActionIcon";
import {
  PlanetAvatar,
  SolarSystemStarAvatar,
  StarAvatar,
  StargateAvatar,
  StationAvatar,
} from "~/components/Avatar";
import { SolarSystemSecurityStatusBadge } from "~/components/Badge";
import { SolarSystemBreadcrumbs } from "~/components/Breadcrumbs";
import { SectionHeader } from "~/components/Home";
import { SolarSystem3D } from "~/components/SolarSystem3D";
import { PlanetName, StarName } from "~/components/Text";
import classes from "./page.module.css";

interface SovereigntyEntry {
  alliance_id?: number;
  corporation_id?: number;
  faction_id?: number;
}

/** Coarse security band shown next to the system name. */
function getSecurityBand(
  securityStatus: number | undefined,
  isWormhole: boolean,
): string | undefined {
  if (securityStatus == null) return undefined;
  if (isWormhole) return "W-Space";
  return securityStatusBand(securityStatus);
}

/** Format a numeric value with a unit suffix, or an em dash when absent. */
function withUnit(value: number | null | undefined, unit: string): string {
  return value == null ? "—" : `${value.toLocaleString()} ${unit}`;
}

/**
 * Stringify a number, or an em dash when absent. The SDE types mark some
 * numeric fields as required but the data can omit them, so accept nullish.
 */
function formatNumber(value: number | null | undefined): string {
  return value == null ? "—" : value.toString();
}

/** A single labelled live-activity metric. */
function StatTile({
  icon,
  label,
  value,
  accent,
  loading,
}: Readonly<{
  icon: ReactNode;
  label: string;
  value: ReactNode;
  accent?: string;
  loading?: boolean;
}>) {
  return (
    <Paper p="md" radius="md">
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
        <Text size="xs" c="dimmed" className={classes.statLabel}>
          {label}
        </Text>
        {icon}
      </Group>
      <Text
        component="div"
        className={classes.statValue}
        mt="sm"
        style={accent ? { color: accent } : undefined}
      >
        {loading ? <Skeleton height={22} width={52} /> : value}
      </Text>
    </Paper>
  );
}

/** Key/value pair used in the System Information panel. */
function InfoItem({
  label,
  value,
}: Readonly<{ label: string; value: ReactNode }>) {
  return (
    <div>
      <Text size="xs" c="dimmed" className={classes.statLabel}>
        {label}
      </Text>
      <Text component="div" size="sm" mt={2}>
        {value}
      </Text>
    </div>
  );
}

/** A boolean SDE trait rendered as an on/off chip. */
function FlagChip({
  label,
  active,
}: Readonly<{ label: string; active?: boolean }>) {
  return (
    <Badge
      variant={active ? "filled" : "outline"}
      color={active ? "eve_primary" : "gray"}
      c={active ? undefined : "dimmed"}
      className={classes.flag}
      styles={active ? undefined : { root: { opacity: 0.55 } }}
    >
      {label}
    </Badge>
  );
}

/** The star, then every planet with its moon / belt tally. */
function PlanetRow({
  planetId,
  moons,
  belts,
}: Readonly<{ planetId: number; moons: number; belts: number }>) {
  return (
    <Anchor
      component={Link}
      href={`/planet/${planetId}`}
      underline="never"
      c="inherit"
      className={classes.row}
    >
      <PlanetAvatar planetId={planetId} size="md" radius={999} />
      <PlanetName
        span
        planetId={planetId}
        fw={500}
        style={{ flex: 1, minWidth: 0 }}
      />
      <Group gap={6} wrap="nowrap">
        {moons > 0 && (
          <Badge
            size="sm"
            variant="light"
            color="gray"
            leftSection={<IconMoon size={12} />}
          >
            {moons}
          </Badge>
        )}
        {belts > 0 && (
          <Badge
            size="sm"
            variant="light"
            color="gray"
            leftSection={<IconMeteor size={12} />}
          >
            {belts}
          </Badge>
        )}
      </Group>
    </Anchor>
  );
}

/** A stargate rendered as a jump to its destination system. */
function StargateConnection({ stargateId }: Readonly<{ stargateId: number }>) {
  const { data: stargate } = useStargate(stargateId);
  const destination = stargate?.data.destination as
    | { system_id: number }
    | undefined;
  const destinationSystemId = destination?.system_id;

  return (
    <Anchor
      component={Link}
      href={destinationSystemId ? `/system/${destinationSystemId}` : "#"}
      underline="never"
      c="inherit"
      className={classes.row}
    >
      <StargateAvatar stargateId={stargateId} size="sm" radius={999} />
      <SolarSystemSecurityStatusBadge
        solarSystemId={destinationSystemId}
        size="sm"
      />
      <SolarSystemName
        span
        solarSystemId={destinationSystemId}
        style={{ flex: 1, minWidth: 0 }}
      />
      <IconChevronRight size={16} color="var(--mantine-color-dimmed)" />
    </Anchor>
  );
}

/** Resolve the sovereignty holder to the right named entity. */
function SovereigntyLabel({ sov }: Readonly<{ sov: SovereigntyEntry }>) {
  if (sov.alliance_id) return <AllianceName span allianceId={sov.alliance_id} />;
  if (sov.corporation_id)
    return <CorporationName span corporationId={sov.corporation_id} />;
  if (sov.faction_id) return <FactionName span factionId={sov.faction_id} />;
  return null;
}

interface FactionWarfare {
  contested: string;
  owner_faction_id: number;
  victory_points: number;
  victory_points_threshold: number;
}

interface Incursion {
  faction_id: number;
  has_boss: boolean;
  influence: number;
  state: string;
}

/** Sovereignty / faction-warfare / incursion status; null when none apply. */
function SystemControlPanels({
  systemId,
  sov,
  fw,
  incursion,
}: Readonly<{
  systemId: number;
  sov?: SovereigntyEntry;
  fw?: FactionWarfare;
  incursion?: Incursion;
}>) {
  const hasSovereignty = Boolean(
    sov?.alliance_id ?? sov?.corporation_id ?? sov?.faction_id,
  );
  const hasFactionWarfare = fw != null;
  const hasIncursion = incursion != null;

  if (hasSovereignty || hasFactionWarfare || hasIncursion) {
    return (
      <SimpleGrid
        cols={{ base: 1, md: hasFactionWarfare && hasIncursion ? 2 : 1 }}
        spacing="md"
      >
        {hasSovereignty && sov && (
          <Paper p="md" radius="md">
            <Group gap="sm" wrap="nowrap">
              <IconShieldHalf
                size={22}
                color="var(--mantine-color-eve_primary-4)"
              />
              <SolarSystemSovereigntyAvatar
                solarSystemId={systemId}
                size={34}
                radius={999}
              />
              <div style={{ minWidth: 0 }}>
                <Text size="xs" c="dimmed" className={classes.statLabel}>
                  Sovereignty
                </Text>
                <Text fw={600}>
                  <SovereigntyLabel sov={sov} />
                </Text>
              </div>
            </Group>
          </Paper>
        )}

        {fw && (
          <Paper p="md" radius="md">
            <Group justify="space-between" mb="xs">
              <Group gap="xs">
                <IconSwords size={18} color="var(--mantine-color-orange-5)" />
                <Text fw={600}>Faction Warfare</Text>
              </Group>
              <Badge
                variant="light"
                color={fw.contested === "contested" ? "orange" : "gray"}
                tt="capitalize"
              >
                {fw.contested}
              </Badge>
            </Group>
            <Group gap={6} mb={6}>
              <FactionAvatar factionId={fw.owner_faction_id} size={20} />
              <Text size="sm">
                <FactionName span factionId={fw.owner_faction_id} />
              </Text>
            </Group>
            <Progress
              value={
                fw.victory_points_threshold > 0
                  ? (fw.victory_points / fw.victory_points_threshold) * 100
                  : 0
              }
              color="orange"
              size="sm"
            />
            <Text size="xs" c="dimmed" mt={4}>
              {fw.victory_points.toLocaleString()} /{" "}
              {fw.victory_points_threshold.toLocaleString()} victory points
            </Text>
          </Paper>
        )}

        {incursion && (
          <Paper p="md" radius="md">
            <Group justify="space-between" mb="xs">
              <Group gap="xs">
                <IconAlertTriangle
                  size={18}
                  color="var(--mantine-color-red-5)"
                />
                <Text fw={600}>Incursion</Text>
              </Group>
              <Badge variant="light" color="red" tt="capitalize">
                {incursion.state}
              </Badge>
            </Group>
            <Group gap={6} mb={6}>
              <FactionAvatar factionId={incursion.faction_id} size={20} />
              <Text size="sm">
                <FactionName span factionId={incursion.faction_id} />
              </Text>
              {incursion.has_boss && (
                <Badge size="sm" variant="outline" color="red">
                  Boss
                </Badge>
              )}
            </Group>
            <Progress value={incursion.influence * 100} color="red" size="sm" />
            <Text size="xs" c="dimmed" mt={4}>
              {(incursion.influence * 100).toFixed(0)}% influence
            </Text>
          </Paper>
        )}
      </SimpleGrid>
    );
  }

  return null;
}

/** The "System Information" panel: physical data, faction owner and traits. */
function SystemInfoSection({
  securityStatus,
  securityClass,
  star,
  sde,
}: Readonly<{
  securityStatus?: number;
  securityClass?: string;
  star?: { data: { spectral_class?: string; temperature?: number } };
  sde?: SolarSystem;
}>) {
  return (
    <section>
      <SectionHeader title="System Information" />
      <Paper p="lg" radius="md">
        <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="lg">
          <InfoItem
            label="Security Status"
            value={securityStatus?.toFixed(2) ?? "—"}
          />
          <InfoItem label="Security Class" value={securityClass ?? "—"} />
          <InfoItem label="Star Type" value={star?.data.spectral_class ?? "—"} />
          <InfoItem
            label="Temperature"
            value={withUnit(star?.data.temperature, "K")}
          />
          <InfoItem
            label="Luminosity"
            value={formatNumber(sde?.luminosity)}
          />
          <InfoItem label="Radius" value={withUnit(sde?.radius, "m")} />
          {sde?.wormholeClassID != null && (
            <InfoItem
              label="Wormhole Class"
              value={String(sde.wormholeClassID)}
            />
          )}
          <InfoItem
            label="Position"
            value={
              <Position3DText
                size="xs"
                position={
                  sde?.position.x != null &&
                  sde.position.y != null &&
                  sde.position.z != null
                    ? [sde.position.x, sde.position.y, sde.position.z]
                    : undefined
                }
              />
            }
          />
        </SimpleGrid>

        {sde?.factionID != null && (
          <Group gap="sm" mt="lg">
            <FactionAvatar factionId={sde.factionID} size={28} radius={999} />
            <div>
              <Text size="xs" c="dimmed" className={classes.statLabel}>
                Faction
              </Text>
              <Text size="sm" fw={500}>
                <FactionName span factionId={sde.factionID} />
              </Text>
            </div>
          </Group>
        )}

        {sde && (
          <Group gap="xs" mt="lg">
            <FlagChip label="Trade Hub" active={sde.hub} />
            <FlagChip label="Border" active={sde.border} />
            <FlagChip label="Fringe" active={sde.fringe} />
            <FlagChip label="Corridor" active={sde.corridor} />
            <FlagChip label="International" active={sde.international} />
            <FlagChip label="Regional" active={sde.regional} />
          </Group>
        )}
      </Paper>
    </section>
  );
}

const EXTERNAL_TOOLS = [
  { label: "DOTLAN", href: (id: number) => `https://evemaps.dotlan.net/system/${id}` },
  { label: "zKillboard", href: (id: number) => `https://zkillboard.com/system/${id}` },
  { label: "Eveeye", href: (id: number) => `https://eveeye.com/?s=${id}` },
  {
    label: "Adam4EVE",
    href: (id: number) => `https://www.adam4eve.eu/location.php?id=${id}`,
  },
];

export default function Page() {
  const params = useParams();
  const rawSystemId = params.systemId;
  const systemId = Number(
    typeof rawSystemId === "string" ? rawSystemId : rawSystemId?.[0],
  );

  const character = useSelectedCharacter();
  const { data: solarSystem } = useSolarSystem(systemId);
  const { data: sdeSolarSystem } = useGetSolarSystemById(systemId);
  const starId = solarSystem?.data.star_id;
  const { data: star } = useStar(starId ?? 0);
  const sov = useSolarSystemSovereignty(systemId) as SovereigntyEntry | undefined;
  const { data: costIndices } = useSolarSystemCostIndices();
  const { data: allJumps } = useAllSolarSystemJumps();
  const { data: allKills } = useAllSolarSystemKills();
  const { data: incursions } = useGetIncursions();
  const { data: fwSystems } = useGetFwSystems();
  const [show3D, setShow3D] = useState(false);

  if (!Number.isFinite(systemId)) {
    return null;
  }

  const data = solarSystem?.data;
  const sde = sdeSolarSystem?.data;

  const securityStatus = data?.security_status;
  const secColor =
    securityStatus == null
      ? "var(--mantine-color-dark-4)"
      : securityStatusColor(securityStatus);
  const isWormhole = (securityStatus ?? 0) < -0.9;
  const band = getSecurityBand(securityStatus, isWormhole);
  const secColorStyle = { "--sec-color": secColor } as CSSProperties;

  const planets = data?.planets ?? [];
  const planetCount = planets.length;
  const moonCount = planets.reduce((sum, p) => sum + (p.moons?.length ?? 0), 0);
  const beltCount = planets.reduce(
    (sum, p) => sum + (p.asteroid_belts?.length ?? 0),
    0,
  );
  const stargates = data?.stargates ?? [];
  const stations = data?.stations ?? [];

  const jumps = allJumps?.data.find((j) => j.system_id === systemId)?.ship_jumps;
  const kills = allKills?.data.find((k) => k.system_id === systemId);
  const incursion = incursions?.data.find(
    (i) =>
      i.infested_solar_systems.includes(systemId) ||
      i.staging_solar_system_id === systemId,
  );
  const fw = fwSystems?.data.find((s) => s.solar_system_id === systemId);

  const hasSovereignty = Boolean(
    sov?.alliance_id ?? sov?.corporation_id ?? sov?.faction_id,
  );
  const systemCostIndices = Object.hasOwn(costIndices, systemId)
    ? (costIndices[systemId]?.cost_indices ?? [])
    : [];

  return (
    <Container size="lg" py="md">
      <Stack gap="xl">
        {/* ---- Hero ---- */}
        <Paper p="xl" radius="md" className={classes.hero}>
          <div className={classes.heroGlow} style={secColorStyle} aria-hidden />
          <Group
            align="flex-start"
            gap="xl"
            wrap="wrap"
            className={classes.heroInner}
          >
            <div className={classes.starWrap} style={secColorStyle}>
              <SolarSystemStarAvatar
                solarSystemId={systemId}
                size={112}
                radius={999}
              />
            </div>
            <Stack gap="sm" style={{ flex: "1 1 320px", minWidth: 0 }}>
              <SolarSystemBreadcrumbs
                solarSystemId={systemId}
                hideSolarSystem
                textProps={{ size: "sm" }}
              />
              <Group gap="sm" align="center">
                <Title order={1} className={classes.title}>
                  <SolarSystemName span solarSystemId={systemId} />
                </Title>
                {character && (
                  <SetAutopilotDestinationActionIcon
                    characterId={character.characterId}
                    destinationId={systemId}
                  />
                )}
              </Group>

              <Group gap="sm" align="center">
                {securityStatus != null && (
                  <span
                    className={classes.secPill}
                    style={{
                      backgroundColor: secColor,
                      color: isLightSecurityStatus(securityStatus)
                        ? "var(--mantine-color-black)"
                        : "var(--mantine-color-white)",
                    }}
                  >
                    {formatSecurityStatus(securityStatus)}
                  </span>
                )}
                {band && (
                  <Text fw={600} className={classes.band}>
                    {band}
                  </Text>
                )}
                {hasSovereignty && sov && (
                  <div className={classes.holderChip}>
                    <SolarSystemSovereigntyAvatar
                      solarSystemId={systemId}
                      size={22}
                      radius={999}
                    />
                    <Text span size="sm" fw={500}>
                      <SovereigntyLabel sov={sov} />
                    </Text>
                  </div>
                )}
              </Group>

              {data ? (
                <Text size="sm" c="dimmed">
                  {planetCount} planets · {moonCount} moons · {beltCount} belts ·{" "}
                  {stations.length} stations · {stargates.length} gates
                </Text>
              ) : (
                <Skeleton height={14} width={280} />
              )}

              <Group gap="xs" mt={4}>
                {EXTERNAL_TOOLS.map((tool) => (
                  <Button
                    key={tool.label}
                    component={Link}
                    href={tool.href(systemId)}
                    target="_blank"
                    size="xs"
                    leftSection={<IconExternalLink size={13} />}
                  >
                    {tool.label}
                  </Button>
                ))}
              </Group>
            </Stack>
          </Group>
        </Paper>

        {/* ---- Live activity (last hour) ---- */}
        <section>
          <SectionHeader title="Activity · Last Hour" />
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
            <StatTile
              icon={
                <IconRocket
                  size={18}
                  stroke={1.6}
                  color="var(--mantine-color-teal-4)"
                />
              }
              label="Ship Jumps"
              value={(jumps ?? 0).toLocaleString()}
              accent="var(--mantine-color-teal-4)"
              loading={allJumps === undefined}
            />
            <StatTile
              icon={
                <IconSwords
                  size={18}
                  stroke={1.6}
                  color="var(--mantine-color-red-5)"
                />
              }
              label="Ship Kills"
              value={(kills?.ship_kills ?? 0).toLocaleString()}
              accent="var(--mantine-color-red-5)"
              loading={allKills === undefined}
            />
            <StatTile
              icon={
                <IconSkull
                  size={18}
                  stroke={1.6}
                  color="var(--mantine-color-grape-4)"
                />
              }
              label="Pod Kills"
              value={(kills?.pod_kills ?? 0).toLocaleString()}
              accent="var(--mantine-color-grape-4)"
              loading={allKills === undefined}
            />
            <StatTile
              icon={
                <IconRobot
                  size={18}
                  stroke={1.6}
                  color="var(--mantine-color-orange-5)"
                />
              }
              label="NPC Kills"
              value={(kills?.npc_kills ?? 0).toLocaleString()}
              accent="var(--mantine-color-orange-5)"
              loading={allKills === undefined}
            />
          </SimpleGrid>
        </section>

        {/* ---- Control: sovereignty / faction warfare / incursion ---- */}
        <SystemControlPanels
          systemId={systemId}
          sov={sov}
          fw={fw}
          incursion={incursion}
        />

        {/* ---- Celestials + connections ---- */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
          <div>
            <SectionHeader title="Celestials" count={planetCount} />
            <Stack gap={2}>
              {starId && (
                <div className={classes.row}>
                  <StarAvatar starId={starId} size="md" radius={999} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <StarName span starId={starId} fw={500} />
                    <Text size="xs" c="dimmed">
                      {star?.data.spectral_class ?? "Star"}
                      {star?.data.temperature != null &&
                        ` · ${star.data.temperature.toLocaleString()} K`}
                    </Text>
                  </div>
                </div>
              )}
              {planets.map((planet) => (
                <PlanetRow
                  key={planet.planet_id}
                  planetId={planet.planet_id}
                  moons={planet.moons?.length ?? 0}
                  belts={planet.asteroid_belts?.length ?? 0}
                />
              ))}
              {!starId && planetCount === 0 && (
                <Skeleton height={48} radius="sm" />
              )}
            </Stack>
          </div>

          <div>
            <SectionHeader title="Stargates" count={stargates.length} />
            <Stack gap={2} mb="lg">
              {stargates.map((stargateId) => (
                <StargateConnection key={stargateId} stargateId={stargateId} />
              ))}
              {stargates.length === 0 && (
                <Text size="sm" c="dimmed">
                  No stargates — this system is only reachable by wormhole.
                </Text>
              )}
            </Stack>

            <SectionHeader title="Stations" count={stations.length} />
            <Stack gap={2}>
              {stations.map((stationId) => (
                <StationAnchor
                  key={stationId}
                  stationId={stationId}
                  underline="never"
                  c="inherit"
                  className={classes.row}
                >
                  <StationAvatar stationId={stationId} size="sm" radius={999} />
                  <StationName
                    span
                    stationId={stationId}
                    style={{ flex: 1, minWidth: 0 }}
                  />
                </StationAnchor>
              ))}
              {stations.length === 0 && (
                <Text size="sm" c="dimmed">
                  No NPC stations in this system.
                </Text>
              )}
            </Stack>
          </div>
        </SimpleGrid>

        {/* ---- Industry cost indices ---- */}
        {systemCostIndices.length > 0 && (
          <section>
            <SectionHeader title="Industry Indices" />
            <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} spacing="md">
              {systemCostIndices.map((index) => (
                <Paper key={index.activity} p="md" radius="md">
                  <Text size="xs" c="dimmed" className={classes.statLabel}>
                    {index.activity.replaceAll("_", " ")}
                  </Text>
                  <Text className={classes.statValue} mt="sm">
                    {(index.cost_index * 100).toFixed(2)}%
                  </Text>
                </Paper>
              ))}
            </SimpleGrid>
          </section>
        )}

        {/* ---- System information ---- */}
        <SystemInfoSection
          securityStatus={securityStatus}
          securityClass={data?.security_class}
          star={star}
          sde={sde}
        />

        {/* ---- 3D system map (loaded on demand — pulls in three.js) ---- */}
        <section>
          <SectionHeader title="System Map" />
          <Paper p="lg" radius="md">
            {show3D ? (
              <Stack gap="sm">
                <SolarSystem3D solarSystemId={systemId} />
                <Group justify="flex-end">
                  <Button
                    variant="subtle"
                    size="xs"
                    onClick={() => setShow3D(false)}
                  >
                    Hide 3D map
                  </Button>
                </Group>
              </Stack>
            ) : (
              <Group justify="space-between" wrap="nowrap">
                <Text size="sm" c="dimmed">
                  Explore the star, planets, moons, stations and stargates in an
                  interactive 3D view.
                </Text>
                <Button size="xs" onClick={() => setShow3D(true)}>
                  Show 3D map
                </Button>
              </Group>
            )}
          </Paper>
        </section>
      </Stack>
    </Container>
  );
}
