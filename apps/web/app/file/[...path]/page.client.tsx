"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import Link from "next/link";
import { LineChart } from "@mantine/charts";
import {
  ActionIcon,
  Anchor,
  Badge,
  Container,
  CopyButton,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconCheck, IconCopy } from "@tabler/icons-react";

import type { FileEvent, FileHistory } from "~/lib/resource-pages";
import { formatBytes } from "~/lib/resource-pages";

const OP_COLOR = { added: "green", modified: "blue", removed: "red" } as const;
const OP_LABEL = { added: "Added", modified: "Changed", removed: "Removed" };

const formatMonth = (time: number) => new Date(time).toISOString().slice(0, 7);

/** One point of the size chart: the file's size from a dated build on. */
export interface SizePoint {
  /** Release time, ms since the epoch. */
  time: number;
  build: number;
  date: string;
  /** Bytes; 0 while the file is removed. */
  size: number;
}

/**
 * The file's size after `event`: 0 once removed, `null` when it was not
 * recorded — diffs from before the pipeline kept sizes have none.
 */
export function sizeAfter(event: FileEvent): number | null {
  return event.op === "removed" ? 0 : event.size;
}

/**
 * The size chart's points, one per dated change of known size. A removal drops
 * to 0 bytes, so a file that was deleted and later restored reads as a gap at
 * the bottom rather than a line carried across it. Builds without a release
 * date cannot be placed on a time axis, and older changes without a recorded
 * size cannot be placed on the size axis; both are still in the table.
 */
export function sizePoints(events: readonly FileEvent[]): SizePoint[] {
  return events.flatMap((event) => {
    const size = sizeAfter(event);
    if (event.date === null || size === null) return [];
    return [
      {
        time: Date.parse(`${event.date}T00:00:00Z`),
        build: event.build,
        date: event.date,
        size,
      },
    ];
  });
}

/**
 * Where the chart marks a change: every dated change, including those whose
 * size was not recorded, once per release date.
 */
export function changeTimes(events: readonly FileEvent[]): number[] {
  const times = events.flatMap((event) =>
    event.date === null ? [] : [Date.parse(`${event.date}T00:00:00Z`)],
  );
  return [...new Set(times)];
}

/**
 * One x-axis tick per month, at the first point in it: ticks at every point
 * repeat a month's label once per change in it.
 */
export function monthTicks(points: readonly SizePoint[]): number[] {
  const byMonth = new Map<string, number>();
  for (const point of points) {
    const month = formatMonth(point.time);
    if (!byMonth.has(month)) byMonth.set(month, point.time);
  }
  return [...byMonth.values()];
}

/**
 * The change in size each event made against the one before it; `null` for
 * the first event, or when either size was not recorded.
 */
export function sizeDeltas(events: readonly FileEvent[]): (number | null)[] {
  return events.map((event, index) => {
    const previous = index === 0 ? undefined : events[index - 1];
    if (!previous) return null;
    const before = sizeAfter(previous);
    const after = sizeAfter(event);
    return before === null || after === null ? null : after - before;
  });
}

function Copyable({
  value,
  children,
}: Readonly<{ value: string; children: ReactNode }>) {
  return (
    <Group gap={4} wrap="nowrap">
      {children}
      <CopyButton value={value} timeout={1500}>
        {({ copied, copy }) => (
          <Tooltip label={copied ? "Copied" : "Copy"} withArrow>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={copy}
              aria-label={copied ? "Copied" : `Copy ${value}`}
            >
              {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            </ActionIcon>
          </Tooltip>
        )}
      </CopyButton>
    </Group>
  );
}

function Stat({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <Paper withBorder radius="md" p="sm">
      <Text
        size="xs"
        c="dimmed"
        tt="uppercase"
        fw={700}
        style={{ letterSpacing: "0.05em" }}
      >
        {label}
      </Text>
      <Text component="div" fw={600}>
        {children}
      </Text>
    </Paper>
  );
}

function SizeTooltip({
  payload,
}: Readonly<{ payload?: readonly { payload?: SizePoint }[] }>) {
  const point = payload?.[0]?.payload;
  if (!point) return null;
  return (
    <Paper withBorder p="xs" radius="sm" shadow="md">
      <Text size="xs" fw={600}>
        Build {point.build}
      </Text>
      <Text size="xs" c="dimmed">
        {point.date}
      </Text>
      <Text size="sm">{formatBytes(point.size)}</Text>
    </Paper>
  );
}

/** A change's effect on the size: "+2 KB" in teal, "−1 KB" in red, else "—". */
function SizeDeltaCell({
  delta,
}: Readonly<{ delta: number | null | undefined }>) {
  if (delta == null || delta === 0) {
    return (
      <Table.Td ta="right" ff="monospace" c="dimmed">
        —
      </Table.Td>
    );
  }
  const grew = delta > 0;
  return (
    <Table.Td ta="right" ff="monospace" c={grew ? "teal" : "red"}>
      {`${grew ? "+" : "−"}${formatBytes(Math.abs(delta))}`}
    </Table.Td>
  );
}

export default function FileHistoryPage({
  history,
}: Readonly<{ history: FileHistory }>) {
  const { path, events } = history;
  const latest = events.at(-1);
  const first = events[0];
  const removed = latest?.op === "removed";
  const points = useMemo(() => sizePoints(events), [events]);
  const deltas = useMemo(() => sizeDeltas(events), [events]);
  const changes = useMemo(() => changeTimes(events), [events]);
  const ticks = useMemo(() => monthTicks(points), [points]);
  const name = path.split("/").at(-1) ?? path;

  return (
    <Container size="lg" py="md">
      <Stack gap="lg">
        <div>
          <Title order={2} style={{ overflowWrap: "anywhere" }}>
            {name}
          </Title>
          <Copyable value={path}>
            <Text
              ff="monospace"
              size="sm"
              c="dimmed"
              style={{ overflowWrap: "anywhere" }}
            >
              {path}
            </Text>
          </Copyable>
        </div>

        <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="sm">
          <Stat label="Current size">
            {removed || latest?.size == null ? (
              <Text span c="dimmed">
                —
              </Text>
            ) : (
              <Tooltip
                label={`${latest.size.toLocaleString("en-US")} bytes`}
                withArrow
              >
                <span>{formatBytes(latest.size)}</span>
              </Tooltip>
            )}
          </Stat>
          <Stat label="MD5">
            {!removed && latest?.hash ? (
              <Copyable value={latest.hash}>
                <Text
                  span
                  ff="monospace"
                  size="sm"
                  style={{ overflowWrap: "anywhere" }}
                >
                  {latest.hash}
                </Text>
              </Copyable>
            ) : (
              <Text span c="dimmed">
                —
              </Text>
            )}
          </Stat>
          <Stat label="Status">
            {removed ? (
              <Badge color="red" variant="light">
                Removed in build {latest.build}
              </Badge>
            ) : (
              <Badge color="green" variant="light">
                Present
              </Badge>
            )}
          </Stat>
          <Stat label="Changes recorded">
            {events.length.toLocaleString("en-US")}
            {first && (
              <Text size="xs" c="dimmed" fw={400}>
                since build {first.build}
              </Text>
            )}
          </Stat>
        </SimpleGrid>

        <Paper withBorder radius="md" p="md">
          <Group justify="space-between" mb="sm">
            <Title order={4}>Size over time</Title>
            <Text size="xs" c="dimmed">
              Tranquility builds · dashed lines mark each change
            </Text>
          </Group>
          {points.length === 0 ? (
            <Text size="sm" c="dimmed">
              None of this file&apos;s changes has both a release date and a
              recorded size to plot.
            </Text>
          ) : (
            <LineChart
              h={260}
              data={points}
              dataKey="time"
              series={[{ name: "size", label: "Size", color: "blue.5" }]}
              curveType="stepAfter"
              withDots
              valueFormatter={formatBytes}
              yAxisProps={{ width: 72 }}
              xAxisProps={{
                type: "number",
                scale: "time",
                domain: ["dataMin", "dataMax"],
                ticks,
                tickFormatter: formatMonth,
              }}
              referenceLines={changes.map((time) => ({
                x: time,
                color: "gray.6",
                strokeDasharray: "4 4",
              }))}
              tooltipProps={{ content: SizeTooltip }}
            />
          )}
        </Paper>

        <Paper withBorder radius="md" p="md">
          <Title order={4} mb="sm">
            Changes
          </Title>
          <Table.ScrollContainer minWidth={560}>
            <Table verticalSpacing={6} fz="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Build</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Change</Table.Th>
                  <Table.Th ta="right">Size</Table.Th>
                  <Table.Th ta="right">Δ</Table.Th>
                  <Table.Th>MD5</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {events
                  .map((event, index) => ({ event, delta: deltas[index] }))
                  .reverse()
                  .map(({ event, delta }) => (
                    <Table.Tr key={event.build}>
                      <Table.Td>
                        <Anchor
                          component={Link}
                          href={`/history/build/${event.build}`}
                        >
                          {event.build}
                        </Anchor>
                      </Table.Td>
                      <Table.Td c="dimmed">{event.date ?? "—"}</Table.Td>
                      <Table.Td>
                        <Badge
                          size="xs"
                          variant="light"
                          color={OP_COLOR[event.op]}
                        >
                          {OP_LABEL[event.op]}
                        </Badge>
                      </Table.Td>
                      <Table.Td ta="right" ff="monospace">
                        {event.size === null ? "—" : formatBytes(event.size)}
                      </Table.Td>
                      <SizeDeltaCell delta={delta} />
                      <Table.Td ff="monospace" c="dimmed" fz="xs">
                        {event.hash ?? "—"}
                      </Table.Td>
                    </Table.Tr>
                  ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Paper>
      </Stack>
    </Container>
  );
}
