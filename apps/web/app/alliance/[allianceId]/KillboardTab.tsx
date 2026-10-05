"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Anchor,
  Box,
  Group,
  Paper,
  Progress,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconCalendarStats,
  IconChartBar,
  IconClock,
  IconMapPin,
  IconRocket,
  IconSkull,
  IconTrophy,
} from "@tabler/icons-react";

import {
  CharacterAnchor,
  CharacterName,
  CorporationName,
  SolarSystemAnchor,
  SolarSystemName,
  TypeAnchor,
  TypeAvatar,
  TypeName,
} from "@jitaspace/eve-components";
import {
  CharacterAvatar,
  CorporationAnchor,
  CorporationAvatar,
  GroupAnchor,
  ISKAmount,
} from "@jitaspace/ui";

import type { ZkbLabelRow, ZkbStats, ZkbTopEntry } from "./zkillboard";
import { SectionHeading, StatCard } from "~/components/EntityPage";
import { GroupName } from "~/components/Text";
import { formatDecimal, formatInteger, formatPercent } from "./format";
import {
  activityGrid,
  iskEfficiency,
  locationBreakdown,
  recentMonths,
  timezoneBreakdown,
  topAllTime,
  topGroups,
} from "./zkillboard";

const BarChart = dynamic(
  () => import("@mantine/charts").then((m) => m.BarChart),
  { ssr: false, loading: () => <Skeleton h={220} /> },
);

const TOP_LIST_SIZE = 10;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The headline numbers; also shown on the Overview tab. */
export function KillboardSummaryCards({
  stats,
  isLoading,
}: Readonly<{ stats: ZkbStats | null | undefined; isLoading: boolean }>) {
  const efficiency = iskEfficiency(stats?.iskDestroyed, stats?.iskLost);
  const rank = stats?.rankings?.alltime?.all?.ranks?.overall;

  const value = (content: ReactNode) =>
    isLoading ? <Skeleton h="1.2em" w="6ch" /> : content;

  return (
    <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="sm">
      <StatCard
        label="Ships destroyed"
        value={value(formatInteger(stats?.shipsDestroyed ?? 0))}
        sub={
          stats?.soloKills
            ? `${formatInteger(stats.soloKills)} solo`
            : undefined
        }
      />
      <StatCard
        label="Ships lost"
        value={value(formatInteger(stats?.shipsLost ?? 0))}
        sub={
          stats?.soloLosses
            ? `${formatInteger(stats.soloLosses)} solo`
            : undefined
        }
      />
      <StatCard
        label="ISK destroyed"
        value={value(<ISKAmount amount={stats?.iskDestroyed ?? 0} />)}
      />
      <StatCard
        label="ISK lost"
        value={value(<ISKAmount amount={stats?.iskLost ?? 0} />)}
      />
      <StatCard
        label="ISK efficiency"
        value={value(efficiency === null ? "—" : formatPercent(efficiency))}
      />
      <StatCard
        label="Danger ratio"
        value={value(
          stats?.dangerRatio === undefined ? "—" : `${stats.dangerRatio}%`,
        )}
        sub="zKillboard's dangerous vs. snuggly score"
      />
      <StatCard
        label="Gang ratio"
        value={value(
          stats?.gangRatio === undefined ? "—" : `${stats.gangRatio}%`,
        )}
        sub="Share of kills made in a gang"
      />
      <StatCard
        label="Average gang"
        value={value(
          stats?.avgGangSize === undefined
            ? "—"
            : `${formatDecimal(stats.avgGangSize)} pilots`,
        )}
      />
      <StatCard
        label="Points destroyed"
        value={value(formatInteger(stats?.pointsDestroyed ?? 0))}
        sub={
          stats?.pointsLost === undefined
            ? undefined
            : `${formatInteger(stats.pointsLost)} lost`
        }
      />
      <StatCard
        label="All-time rank"
        value={value(rank === undefined ? "—" : `#${formatInteger(rank)}`)}
        sub="Among alliances on zKillboard"
      />
    </SimpleGrid>
  );
}

function BreakdownTable({ rows }: Readonly<{ rows: ZkbLabelRow[] }>) {
  const total = rows.reduce((sum, row) => sum + row.kills + row.losses, 0);
  return (
    <Table verticalSpacing={6}>
      <Table.Tbody>
        {rows.map((row) => (
          <Table.Tr key={row.key}>
            <Table.Td w="30%">
              <Text size="sm">{row.label}</Text>
            </Table.Td>
            <Table.Td>
              <Tooltip
                label={`${formatInteger(row.kills)} kills · ${formatInteger(row.losses)} losses`}
              >
                <Progress.Root size="lg">
                  <Progress.Section
                    value={total > 0 ? (row.kills / total) * 100 : 0}
                    color="teal"
                  />
                  <Progress.Section
                    value={total > 0 ? (row.losses / total) * 100 : 0}
                    color="red"
                  />
                </Progress.Root>
              </Tooltip>
            </Table.Td>
            <Table.Td ta="right" w="20%">
              <Text size="xs" c="dimmed">
                {total > 0
                  ? formatPercent((row.kills + row.losses) / total)
                  : null}
              </Text>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

function ActivityHeatmap({
  activity,
}: Readonly<{ activity: ZkbStats["activity"] }>) {
  const grid = useMemo(() => activityGrid(activity), [activity]);
  if (grid === null) {
    return (
      <Text size="sm" c="dimmed">
        No recent kills.
      </Text>
    );
  }
  return (
    <Box style={{ overflowX: "auto" }}>
      <Box
        style={{
          display: "grid",
          gridTemplateColumns: "2.5em repeat(24, minmax(14px, 1fr))",
          gap: 2,
          minWidth: 420,
        }}
      >
        <span />
        {Array.from({ length: 24 }, (_, hour) => (
          <Text key={hour} size="10px" c="dimmed" ta="center">
            {hour % 3 === 0 ? String(hour).padStart(2, "0") : ""}
          </Text>
        ))}
        {grid.cells.map((hours, day) => [
          <Text key={`label-${day}`} size="xs" c="dimmed">
            {WEEKDAYS[day]}
          </Text>,
          ...hours.map((kills, hour) => (
            <Tooltip
              key={`${day}-${hour}`}
              label={`${WEEKDAYS[day]} ${String(hour).padStart(2, "0")}:00 EVE time — ${formatInteger(kills)} kills`}
            >
              <Box
                style={{
                  height: 14,
                  borderRadius: 2,
                  background:
                    kills === 0
                      ? "var(--mantine-color-dark-6)"
                      : `rgba(18, 184, 134, ${0.15 + 0.85 * (kills / grid.max)})`,
                }}
              />
            </Tooltip>
          )),
        ])}
      </Box>
    </Box>
  );
}

type TopListKind = "character" | "corporation" | "ship" | "system";

function TopEntity({
  kind,
  entry,
}: Readonly<{ kind: TopListKind; entry: ZkbTopEntry }>) {
  switch (kind) {
    case "character":
      return (
        <Group gap="xs" wrap="nowrap">
          <CharacterAvatar characterId={entry.characterID} size="sm" />
          <CharacterAnchor characterId={entry.characterID} prefetch={false}>
            <CharacterName span characterId={entry.characterID} />
          </CharacterAnchor>
        </Group>
      );
    case "corporation":
      return (
        <Group gap="xs" wrap="nowrap">
          <CorporationAvatar corporationId={entry.corporationID} size="sm" />
          <CorporationAnchor
            corporationId={entry.corporationID}
            prefetch={false}
          >
            <CorporationName span corporationId={entry.corporationID} />
          </CorporationAnchor>
        </Group>
      );
    case "ship":
      return (
        <Group gap="xs" wrap="nowrap">
          <TypeAvatar typeId={entry.shipTypeID} size="sm" />
          <TypeAnchor typeId={entry.shipTypeID} prefetch={false}>
            <TypeName span typeId={entry.shipTypeID} />
          </TypeAnchor>
        </Group>
      );
    case "system":
      return (
        <SolarSystemAnchor solarSystemId={entry.solarSystemID} prefetch={false}>
          <SolarSystemName span solarSystemId={entry.solarSystemID} />
        </SolarSystemAnchor>
      );
  }
}

function TopList({
  title,
  kind,
  entries,
}: Readonly<{ title: string; kind: TopListKind; entries: ZkbTopEntry[] }>) {
  if (entries.length === 0) return null;
  return (
    <Paper withBorder radius="md" p="sm">
      <Stack gap="xs">
        <Text
          fw={700}
          size="sm"
          c="gray.0"
          tt="uppercase"
          style={{ letterSpacing: "0.04em" }}
        >
          {title}
        </Text>
        <Table highlightOnHover verticalSpacing={4}>
          <Table.Tbody>
            {entries.slice(0, TOP_LIST_SIZE).map((entry, index) => (
              <Table.Tr key={index}>
                <Table.Td w={28}>
                  <Text size="xs" c="dimmed">
                    {index + 1}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <TopEntity kind={kind} entry={entry} />
                </Table.Td>
                <Table.Td ta="right">
                  <Text size="sm" ff="monospace">
                    {formatInteger(entry.kills)}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>
    </Paper>
  );
}

export function KillboardTab({
  allianceId,
  stats,
  isLoading,
  isError,
}: Readonly<{
  allianceId: number;
  stats: ZkbStats | null | undefined;
  isLoading: boolean;
  isError: boolean;
}>) {
  const months = useMemo(() => recentMonths(stats?.months, 24), [stats]);
  const locations = useMemo(() => locationBreakdown(stats?.labels), [stats]);
  const timezones = useMemo(() => timezoneBreakdown(stats?.labels), [stats]);
  const groups = useMemo(() => topGroups(stats?.groups, 12), [stats]);

  const attribution = (
    <Text size="xs" c="dimmed">
      Statistics from{" "}
      <Anchor
        href={`https://zkillboard.com/alliance/${allianceId}/`}
        target="_blank"
        rel="noopener noreferrer"
        size="xs"
      >
        zKillboard
      </Anchor>
      , covering every killmail it has received for this alliance.
    </Text>
  );

  if (isError) {
    return (
      <Stack gap="sm">
        <Text c="dimmed">zKillboard did not answer. Try again later.</Text>
        {attribution}
      </Stack>
    );
  }
  if (
    !isLoading &&
    (stats === null || (stats && !stats.shipsDestroyed && !stats.shipsLost))
  ) {
    return (
      <Stack gap="sm">
        <Text c="dimmed">
          zKillboard has no kills or losses for this alliance.
        </Text>
        {attribution}
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Stack gap="sm">
        <SectionHeading icon={<IconSkull size={18} />}>All time</SectionHeading>
        <KillboardSummaryCards stats={stats} isLoading={isLoading} />
      </Stack>

      {months.length > 0 && (
        <Stack gap="sm">
          <SectionHeading icon={<IconCalendarStats size={18} />}>
            Last {months.length} months on record
          </SectionHeading>
          <Paper withBorder radius="md" p="sm">
            <BarChart
              h={220}
              data={months}
              dataKey="month"
              series={[
                { name: "kills", label: "Kills", color: "teal.6" },
                { name: "losses", label: "Losses", color: "red.6" },
              ]}
              tickLine="y"
              gridAxis="y"
              withLegend
              valueFormatter={(v) => formatInteger(v)}
            />
          </Paper>
        </Stack>
      )}

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        {locations.length > 0 && (
          <Stack gap="sm">
            <SectionHeading icon={<IconMapPin size={18} />}>
              Where they fight
            </SectionHeading>
            <Paper withBorder radius="md" p="sm">
              <BreakdownTable rows={locations} />
            </Paper>
          </Stack>
        )}
        {timezones.length > 0 && (
          <Stack gap="sm">
            <SectionHeading icon={<IconClock size={18} />}>
              When they fight
            </SectionHeading>
            <Paper withBorder radius="md" p="sm">
              <BreakdownTable rows={timezones} />
            </Paper>
          </Stack>
        )}
      </SimpleGrid>
      {(locations.length > 0 || timezones.length > 0) && (
        <Text size="xs" c="dimmed" mt={-12}>
          Green is kills, red is losses; the percentage is each row&apos;s share
          of all kills and losses.
        </Text>
      )}

      {stats?.activity && (
        <Stack gap="sm">
          <SectionHeading icon={<IconChartBar size={18} />}>
            Recent activity (EVE time)
          </SectionHeading>
          <Paper withBorder radius="md" p="sm">
            <ActivityHeatmap activity={stats.activity} />
          </Paper>
        </Stack>
      )}

      {groups.length > 0 && (
        <Stack gap="sm">
          <SectionHeading icon={<IconRocket size={18} />}>
            Ship classes
          </SectionHeading>
          <Paper withBorder radius="md" p="sm">
            <Table highlightOnHover verticalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Group</Table.Th>
                  <Table.Th ta="right">Destroyed</Table.Th>
                  <Table.Th ta="right">Lost</Table.Th>
                  <Table.Th ta="right">ISK destroyed</Table.Th>
                  <Table.Th ta="right">ISK lost</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {groups.map((group) => (
                  <Table.Tr key={group.groupId}>
                    <Table.Td>
                      <GroupAnchor groupId={group.groupId}>
                        <GroupName groupId={group.groupId} />
                      </GroupAnchor>
                    </Table.Td>
                    <Table.Td ta="right">{formatInteger(group.kills)}</Table.Td>
                    <Table.Td ta="right">
                      {formatInteger(group.losses)}
                    </Table.Td>
                    <Table.Td ta="right">
                      <ISKAmount amount={group.iskDestroyed} size="sm" />
                    </Table.Td>
                    <Table.Td ta="right">
                      <ISKAmount amount={group.iskLost} size="sm" />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Stack>
      )}

      {stats?.topAllTime && (
        <Stack gap="sm">
          <SectionHeading icon={<IconTrophy size={18} />}>
            All-time top killers
          </SectionHeading>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <TopList
              title="Pilots"
              kind="character"
              entries={topAllTime(stats, "character")}
            />
            <TopList
              title="Corporations"
              kind="corporation"
              entries={topAllTime(stats, "corporation")}
            />
            <TopList
              title="Ships"
              kind="ship"
              entries={topAllTime(stats, "ship")}
            />
            <TopList
              title="Systems"
              kind="system"
              entries={topAllTime(stats, "system")}
            />
          </SimpleGrid>
        </Stack>
      )}

      {attribution}
    </Stack>
  );
}
