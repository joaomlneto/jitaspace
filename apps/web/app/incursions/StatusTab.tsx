"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import {
  ActionIcon,
  Anchor,
  Box,
  Grid,
  Group,
  Paper,
  Popover,
  Progress,
  Stack,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronRight,
  IconClockHour4,
  IconInfoCircle,
  IconTool,
} from "@tabler/icons-react";
import { formatDistanceStrict } from "date-fns";

import { DateHoverCard, securityStatusBand } from "@jitaspace/ui";

import type { HighSecSpawnOutlook } from "./math";
import type { Names } from "./parts";
import type { IncursionSiteRole } from "./siteRoles";
import type {
  IncursionRow,
  IncursionsData,
  TrackedIncursionRow,
} from "./types";
import { InfluenceChart } from "./InfluenceChart";
import {
  formatCountdown,
  HIGH_SEC_SPAWN_BLOCKED_MS,
  HIGH_SEC_SPAWN_EXPECTED_MS,
  highSecSpawnOutlook,
  latestEnd,
} from "./math";
import {
  BossBadge,
  ConstellationLink,
  DotlanLink,
  eveTime,
  percent,
  SovereigntyHolderLabel,
  STATE_TIMESTAMP,
  StateBadge,
  SystemLink,
  useLiveNow,
} from "./parts";
import { incursionSiteRole } from "./siteRoles";
import { isTrackedIncursion } from "./types";

type SystemRole = "staging" | IncursionSiteRole | "unknown";
const ROLE_ORDER: SystemRole[] = [
  "staging",
  "vanguard",
  "assault",
  "headquarters",
  "unknown",
];
const ROLE_LABEL: Record<SystemRole, string> = {
  staging: "Staging",
  vanguard: "Vanguard",
  assault: "Assault",
  headquarters: "Headquarters",
  unknown: "Infested",
};

const roleOf = (
  solarSystemId: number,
  stagingSolarSystemId: number,
): SystemRole =>
  solarSystemId === stagingSolarSystemId
    ? "staging"
    : (incursionSiteRole(solarSystemId) ?? "unknown");

const isHighSec = (securityStatus: number | undefined) =>
  securityStatus !== undefined &&
  securityStatusBand(securityStatus) === "High-Sec";

/** When a high-sec incursion can next spawn, counting from the last to end. */
function HighSecSpawnBanner({
  data,
  names,
}: Readonly<{ data: IncursionsData; names: Names }>) {
  const now = useLiveNow(Date.parse(data.readAt));
  const stagingSecurity = (i: IncursionRow) =>
    i.stagingSolarSystemId === null
      ? undefined
      : names.system(i.stagingSolarSystemId)?.securityStatus;
  const lastHighSecEndedAt = data.incursions
    .filter((i) => i.endedAt !== null && isHighSec(stagingSecurity(i)))
    .reduce<number | undefined>((latest, i) => {
      const endedAt = Date.parse(i.endedAt ?? "");
      return latest === undefined || endedAt > latest ? endedAt : latest;
    }, undefined);
  const outlook = highSecSpawnOutlook({
    hasActiveHighSec: data.incursions.some(
      (i) => i.endedAt === null && isHighSec(stagingSecurity(i)),
    ),
    lastHighSecEndedAt,
    now,
  });
  if (outlook.kind === "none" || lastHighSecEndedAt === undefined) return null;
  return (
    <SpawnOutlook outlook={outlook} endedAt={lastHighSecEndedAt} now={now} />
  );
}

/** Where now sits on the 36 hours after the last high-sec incursion ended. */
const spawnPosition = (endedAt: number, now: number) =>
  Math.min(1, Math.max(0, (now - endedAt) / HIGH_SEC_SPAWN_EXPECTED_MS));

const BLOCKED_SHARE = HIGH_SEC_SPAWN_BLOCKED_MS / HIGH_SEC_SPAWN_EXPECTED_MS;
const HOUR_MS = 60 * 60 * 1000;
/** The window's bounds in hours (12 and 36), for its labels. */
const BLOCKED_HOURS = HIGH_SEC_SPAWN_BLOCKED_MS / HOUR_MS;
const EXPECTED_HOURS = HIGH_SEC_SPAWN_EXPECTED_MS / HOUR_MS;

/**
 * When the next high-sec incursion is due, in one line, over a timeline of the
 * 36 hours after the last one ended: 12 in which none can spawn, then the
 * window in which one usually does. The details open from the info button.
 */
function SpawnOutlook({
  outlook,
  endedAt,
  now,
}: Readonly<{
  outlook: Exclude<HighSecSpawnOutlook, { kind: "none" }>;
  endedAt: number;
  now: number;
}>) {
  let status: string;
  if (outlook.kind === "blocked") {
    status = `can spawn in ${formatCountdown(outlook.until - now)}`;
  } else if (outlook.kind === "expected") {
    status = `due within ${formatCountdown(outlook.until - now)}`;
  } else {
    status = "overdue";
  }
  const position = spawnPosition(endedAt, now);
  return (
    <Paper withBorder radius="md" p="sm">
      <Stack gap={6}>
        <Group justify="space-between" gap={4} wrap="wrap">
          <Group gap={6} wrap="nowrap">
            <IconClockHour4 size={16} aria-hidden style={{ flexShrink: 0 }} />
            <Text size="sm" fw={600} style={{ whiteSpace: "nowrap" }}>
              Next high-sec incursion
            </Text>
            {/* A button, so a tap or the keyboard opens it, not only hover. */}
            <Popover width={280} withArrow shadow="md" position="bottom-start">
              <Popover.Target>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="xs"
                  aria-label="How this is worked out"
                >
                  <IconInfoCircle size={14} />
                </ActionIcon>
              </Popover.Target>
              <Popover.Dropdown>
                <Text size="xs">
                  None can spawn within {BLOCKED_HOURS} hours of the last
                  high-sec incursion ending, and one usually does within{" "}
                  {EXPECTED_HOURS}. The last ended {eveTime(endedAt)}.
                </Text>
              </Popover.Dropdown>
            </Popover>
          </Group>
          <Text
            size="sm"
            fw={600}
            ff="monospace"
            c={outlook.kind === "blocked" ? "dimmed" : "cyan"}
            style={{ whiteSpace: "nowrap" }}
          >
            {status}
          </Text>
        </Group>
        <Box
          pos="relative"
          h={8}
          role="img"
          aria-label={`Timeline: ${Math.round(position * EXPECTED_HOURS)} of ${EXPECTED_HOURS} hours since the last ended`}
        >
          <Group gap={2} h="100%" wrap="nowrap">
            <Box
              h="100%"
              w={`${BLOCKED_SHARE * 100}%`}
              bg="var(--mantine-color-gray-light)"
              style={{ borderRadius: "4px 0 0 4px" }}
            />
            <Box
              h="100%"
              style={{ flex: 1, borderRadius: "0 4px 4px 0", opacity: 0.6 }}
              bg="var(--mantine-color-cyan-filled)"
            />
          </Group>
          <Box
            pos="absolute"
            top={-3}
            h={14}
            w={3}
            bg="var(--mantine-color-bright)"
            style={{
              left: `calc(${position * 100}% - 1.5px)`,
              borderRadius: 2,
            }}
          />
        </Box>
        <Box pos="relative" h={18} aria-hidden>
          <Text size="xs" c="dimmed" pos="absolute" left={0}>
            Last ended
          </Text>
          <Text
            size="xs"
            c="dimmed"
            pos="absolute"
            style={{
              left: `${BLOCKED_SHARE * 100}%`,
              transform: "translateX(-50%)",
            }}
          >
            +{BLOCKED_HOURS}h
          </Text>
          <Text size="xs" c="dimmed" pos="absolute" right={0}>
            +{EXPECTED_HOURS}h
          </Text>
        </Box>
      </Stack>
    </Paper>
  );
}

function MaxRemaining({
  incursion,
  readAt,
}: Readonly<{ incursion: TrackedIncursionRow; readAt: number }>) {
  const now = useLiveNow(readAt);
  const enteredAt = Date.parse(
    incursion[STATE_TIMESTAMP[incursion.state]] ?? incursion.firstSeenAt,
  );
  const end = latestEnd(incursion.state, enteredAt);
  return (
    // The latest it can end, in local and EVE time.
    <DateHoverCard date={new Date(end)}>
      <Text
        span
        size="sm"
        fw={500}
        ff="monospace"
        style={{ whiteSpace: "nowrap" }}
      >
        {formatCountdown(end - now)}
      </Text>
    </DateHoverCard>
  );
}

function InfoRow({
  label,
  tooltip,
  children,
}: Readonly<{ label: string; tooltip?: string; children: React.ReactNode }>) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="xs">
      {tooltip ? (
        <Tooltip label={tooltip} multiline w={240}>
          <Text size="sm" c="dimmed" style={{ cursor: "help" }}>
            {label}
          </Text>
        </Tooltip>
      ) : (
        <Text size="sm" c="dimmed">
          {label}
        </Text>
      )}
      {children}
    </Group>
  );
}

function SystemsTable({
  incursion,
  names,
}: Readonly<{ incursion: TrackedIncursionRow; names: Names }>) {
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set());
  const systems = useMemo(() => {
    const ids = [
      ...new Set([
        incursion.stagingSolarSystemId,
        ...incursion.infestedSolarSystemIds,
      ]),
    ];
    return ids
      .map((solarSystemId) => ({
        solarSystemId,
        role: roleOf(solarSystemId, incursion.stagingSolarSystemId),
        system: names.system(solarSystemId),
      }))
      .sort(
        (a, b) =>
          ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) ||
          (a.system?.name ?? "").localeCompare(b.system?.name ?? ""),
      );
  }, [incursion, names]);

  const toggle = (solarSystemId: number) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(solarSystemId)) next.delete(solarSystemId);
      else next.add(solarSystemId);
      return next;
    });

  return (
    <Table verticalSpacing={4} horizontalSpacing="xs" fz="sm">
      <Table.Thead>
        <Table.Tr>
          <Table.Th w={28} />
          <Table.Th>System</Table.Th>
          <Table.Th ta="right">
            <Tooltip
              label="Approximation of the longest warp: the farthest apart two of the star, planets, stargates and stations are"
              multiline
              w={260}
            >
              <Group
                gap={4}
                justify="flex-end"
                wrap="nowrap"
                style={{ cursor: "help" }}
              >
                Size
                <IconInfoCircle size={14} aria-hidden />
              </Group>
            </Tooltip>
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {systems.map(({ solarSystemId, role, system }, index) => {
          const stations = system?.stations ?? [];
          const isOpen = expanded.has(solarSystemId);
          return (
            <Fragment key={solarSystemId}>
              {systems[index - 1]?.role !== role && (
                <Table.Tr>
                  <Table.Td colSpan={3} py={2}>
                    <Text
                      size="xs"
                      fw={700}
                      c="dimmed"
                      tt="uppercase"
                      style={{ letterSpacing: "0.05em" }}
                    >
                      {ROLE_LABEL[role]}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              <Table.Tr>
                <Table.Td>
                  {stations.length > 0 && (
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      color="gray"
                      onClick={() => toggle(solarSystemId)}
                      aria-expanded={isOpen}
                      aria-label={`${isOpen ? "Hide" : "Show"} stations in ${system?.name ?? solarSystemId}`}
                    >
                      {isOpen ? (
                        <IconChevronDown size={14} />
                      ) : (
                        <IconChevronRight size={14} />
                      )}
                    </ActionIcon>
                  )}
                </Table.Td>
                <Table.Td>
                  <SystemLink solarSystemId={solarSystemId} names={names} />
                </Table.Td>
                <Table.Td ta="right" style={{ whiteSpace: "nowrap" }}>
                  {system?.longestWarpAu
                    ? `${system.longestWarpAu.toFixed(0)} AU`
                    : "—"}
                </Table.Td>
              </Table.Tr>
              {isOpen && (
                <Table.Tr>
                  <Table.Td />
                  <Table.Td colSpan={2}>
                    <Stack gap={2}>
                      {stations.map((station) => (
                        <Group key={station.stationId} gap={6} wrap="nowrap">
                          <Anchor
                            component={Link}
                            href={`/station/${station.stationId}`}
                            size="xs"
                          >
                            {station.name}
                          </Anchor>
                          {station.hasRepair && (
                            <Tooltip label="Repair facilities">
                              <IconTool
                                size={14}
                                aria-label="Repair facilities"
                                color="var(--mantine-color-dimmed)"
                              />
                            </Tooltip>
                          )}
                        </Group>
                      ))}
                    </Stack>
                  </Table.Td>
                </Table.Tr>
              )}
            </Fragment>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}

/** "3 days ago", ticking: only this text re-renders every second. */
function StartedAgo({
  incursion,
  readAt,
}: Readonly<{ incursion: TrackedIncursionRow; readAt: number }>) {
  const now = useLiveNow(readAt);
  const startedAt = Date.parse(incursion.firstSeenAt);
  return (
    <DateHoverCard date={new Date(startedAt)}>
      <Text span size="sm" fw={500}>
        {incursion.isObservedFromStart ? "" : "over "}
        {formatDistanceStrict(startedAt, now)} ago
      </Text>
    </DateHoverCard>
  );
}

/** One active incursion, as a full-width row: details, influence, systems. */
function ActiveIncursion({
  incursion,
  data,
  names,
}: Readonly<{
  incursion: TrackedIncursionRow;
  data: IncursionsData;
  names: Names;
}>) {
  const readAt = Date.parse(data.readAt);
  const region = names.region(incursion.constellationId);
  const sovereignty = data.currentSovereignty[
    incursion.stagingSolarSystemId
  ] ?? {
    allianceId: incursion.stagingSovereigntyAllianceId,
    factionId: incursion.stagingSovereigntyFactionId,
  };
  const stagingSecurity = names.system(
    incursion.stagingSolarSystemId,
  )?.securityStatus;
  return (
    <Paper withBorder radius="md" p="md">
      <Grid gap="lg">
        <Grid.Col span={{ base: 12, md: 5, lg: 4 }}>
          <Stack gap="sm">
            <Group justify="space-between" align="flex-start" gap="xs">
              <Stack gap={0}>
                <Group gap={6} wrap="nowrap">
                  <ConstellationLink
                    constellationId={incursion.constellationId}
                    names={names}
                    size="lg"
                    fw={700}
                  />
                  <DotlanLink
                    constellationId={incursion.constellationId}
                    names={names}
                  />
                </Group>
                <Text size="xs" c="dimmed">
                  {stagingSecurity !== undefined &&
                    `${securityStatusBand(stagingSecurity)} · `}
                  {region && (
                    <Anchor
                      component={Link}
                      href={`/region/${region.regionId}`}
                      inherit
                      c="dimmed"
                    >
                      {region.name}
                    </Anchor>
                  )}
                </Text>
              </Stack>
              <Group gap={6}>
                {incursion.hasBoss && <BossBadge />}
                <StateBadge state={incursion.state} />
              </Group>
            </Group>

            <InfoRow label="Influence">
              <Group
                gap="xs"
                wrap="nowrap"
                style={{ flex: 1 }}
                justify="flex-end"
              >
                <Progress
                  value={incursion.influence * 100}
                  color="cyan"
                  size="sm"
                  style={{ flex: 1, maxWidth: 220 }}
                  aria-label={`Influence ${percent(incursion.influence)}`}
                />
                <Text size="sm" fw={500} w={40} ta="right">
                  {percent(incursion.influence)}
                </Text>
              </Group>
            </InfoRow>
            <InfoRow label="Staging">
              <SystemLink
                solarSystemId={incursion.stagingSolarSystemId}
                names={names}
              />
            </InfoRow>
            <InfoRow label="Sovereignty">
              <SovereigntyHolderLabel
                holder={sovereignty}
                names={names}
                size="xs"
              />
            </InfoRow>
            <InfoRow
              label="Started"
              tooltip={
                incursion.isObservedFromStart
                  ? "When it was first listed by ESI"
                  : "It was already running when tracking began: this is when it was first seen, not when it spawned"
              }
            >
              <StartedAgo incursion={incursion} readAt={readAt} />
            </InfoRow>
            <InfoRow
              label="Max. remaining"
              tooltip="The longest the incursion can still stay: up to 8 days once established, 3 once mobilizing, 1 once withdrawing"
            >
              <MaxRemaining incursion={incursion} readAt={readAt} />
            </InfoRow>
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 7, lg: 4 }}>
          <Stack gap={4}>
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">
              Influence, last 72 hours
            </Text>
            <InfluenceChart
              readings={data.influence[incursion.incursionId] ?? []}
              now={readAt}
              h={190}
            />
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <SystemsTable incursion={incursion} names={names} />
        </Grid.Col>
      </Grid>
    </Paper>
  );
}

export function StatusTab({
  data,
  names,
}: Readonly<{ data: IncursionsData; names: Names }>) {
  // High-sec first, as players look for those first.
  const active = useMemo(
    () =>
      data.incursions
        .filter((i) => i.endedAt === null)
        .filter(isTrackedIncursion)
        .sort(
          (a, b) =>
            (names.system(b.stagingSolarSystemId)?.securityStatus ?? -1) -
            (names.system(a.stagingSolarSystemId)?.securityStatus ?? -1),
        ),
    [data.incursions, names],
  );

  return (
    <Stack gap="md">
      <HighSecSpawnBanner data={data} names={names} />
      {active.length === 0 ? (
        <Paper withBorder radius="md" p="lg">
          <Text c="dimmed">No incursions are active right now.</Text>
        </Paper>
      ) : (
        active.map((incursion) => (
          <ActiveIncursion
            key={incursion.incursionId}
            incursion={incursion}
            data={data}
            names={names}
          />
        ))
      )}
      <Text size="xs" c="dimmed">
        Vanguard, Assault and Headquarters systems come from the community map{" "}
        <Anchor
          href="https://github.com/Shadowlauch/eve-incursions-node"
          target="_blank"
          rel="noopener noreferrer"
          inherit
        >
          eve-incursions.de
        </Anchor>{" "}
        kept; null-sec constellations were never mapped. ESI names only the
        staging system.
      </Text>
    </Stack>
  );
}
