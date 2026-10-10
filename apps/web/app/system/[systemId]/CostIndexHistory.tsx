"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { Alert, Group, Paper, Skeleton, Stack, Text } from "@mantine/core";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  CostIndexActivityKey,
  CostIndexChartRow,
  CostIndexHistory as CostIndexHistoryData,
  CostIndexRange,
} from "./costIndices";
import { niceTicks, tickFormatter } from "~/components/Market/priceHistory";
import { Segmented } from "~/components/Wars/WarRoom/parts";
import classes from "./CostIndexHistory.module.css";
import { buildCostIndexChartRows, COST_INDEX_ACTIVITIES } from "./costIndices";

const CHART_HEIGHT = 280;
const X_TICK_COUNT = 6;

const RANGE_OPTIONS: readonly { value: CostIndexRange; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "1y", label: "1Y" },
  { value: "all", label: "All" },
];

const seriesColor = (key: CostIndexActivityKey) => `var(--series-${key})`;

const shortDate = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const longDate = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const monthYear = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  timeZone: "UTC",
});
const dayHour = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});
const DAY_MS = 24 * 60 * 60 * 1000;

/** Tick labels as fine as the span shown: hours, days, or months. */
const tickFormat = (span: number) => {
  if (span <= 3 * DAY_MS) return dayHour;
  if (span <= 540 * DAY_MS) return shortDate;
  return monthYear;
};

const dateTime = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

/** A cost index as EVE shows it: a percentage of the job's value. */
export const formatCostIndex = (value: number) =>
  `${(value * 100).toFixed(2)}%`;

function SeriesKey({ color }: Readonly<{ color: string }>) {
  return (
    <span
      aria-hidden
      className={classes.key}
      style={{ "--key-color": color } as CSSProperties}
    />
  );
}

function useCostIndexHistory(systemId: number, range: CostIndexRange) {
  return useQuery({
    queryKey: ["system-cost-indices", systemId, range],
    queryFn: async (): Promise<CostIndexHistoryData> => {
      const response = await fetch(
        `/api/system/${systemId}/cost-indices?range=${range}`,
      );
      if (!response.ok) {
        throw new Error(`Cost indices: HTTP ${response.status}`);
      }
      return (await response.json()) as CostIndexHistoryData;
    },
    // Switching ranges keeps the last chart up until the next one arrives.
    placeholderData: keepPreviousData,
    staleTime: 10 * 60 * 1000,
  });
}

/** Every visible index at the hovered time, values in text ink. */
function HistoryTooltip({
  active,
  payload,
  visible,
  daily,
}: Readonly<{
  active?: boolean;
  payload?: readonly { payload?: CostIndexChartRow }[];
  visible: Set<CostIndexActivityKey>;
  daily: boolean;
}>) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  const shown = COST_INDEX_ACTIVITIES.filter(({ key }) => visible.has(key));
  const recorded = shown.some(({ key }) => row[key] !== null);
  return (
    <Paper
      withBorder
      shadow="md"
      p="xs"
      radius="md"
      className={classes.tooltip}
    >
      <Text size="xs" c="dimmed" mb={4}>
        {daily ? longDate.format(row.time) : dateTime.format(row.time)}
      </Text>
      {recorded ? (
        shown.map(({ key, label }) => (
          <div key={key} className={classes.tooltipRow}>
            <SeriesKey color={seriesColor(key)} />
            <Text size="xs" c="dimmed">
              {label}
            </Text>
            <Text size="xs" className={classes.tooltipValue}>
              {row[key] === null ? "—" : formatCostIndex(row[key])}
            </Text>
          </div>
        ))
      ) : (
        <Text size="xs">Nothing recorded from here to the next point.</Text>
      )}
    </Paper>
  );
}

function Caption({ history }: Readonly<{ history: CostIndexHistoryData }>) {
  const parts: string[] = [];
  if (history.firstSnapshotAt !== null) {
    parts.push(`Recorded since ${longDate.format(history.firstSnapshotAt)}.`);
  }
  if (history.resolution === "day") {
    parts.push("One point per day: the value each day closed on.");
  }
  if (history.gaps.length > 0) {
    parts.push(
      `Breaks in the lines are gaps in the record (${history.gaps.length.toLocaleString()} in this range).`,
    );
  }
  return (
    <Text size="xs" c="dimmed">
      {parts.join(" ")}
    </Text>
  );
}

/**
 * How a solar system's industry cost indices moved over time, from our
 * hourly record (and EVE Ref's archive before it). Every activity is shown by
 * default; the chips toggle them.
 */
export function CostIndexHistory({ systemId }: Readonly<{ systemId: number }>) {
  const [range, setRange] = useState<CostIndexRange>("30d");
  const [visible, setVisible] = useState<Set<CostIndexActivityKey>>(
    () => new Set(COST_INDEX_ACTIVITIES.map(({ key }) => key)),
  );
  const { data, error, isPending } = useCostIndexHistory(systemId, range);
  const rows = useMemo(
    () => (data ? buildCostIndexChartRows(data) : []),
    [data],
  );
  const domain: [number | string, number | string] = [
    data?.from ?? "dataMin",
    data?.latestSnapshotAt ?? "dataMax",
  ];
  const span =
    (data?.latestSnapshotAt ?? 0) -
    (data?.from ?? rows[0]?.time ?? data?.latestSnapshotAt ?? 0);
  const ticks = tickFormat(span);
  // Evenly across the range: Recharts places its own ticks by the data, and
  // a range that is mostly gap would get one.
  const xTicks =
    data?.latestSnapshotAt == null || span <= 0
      ? undefined
      : Array.from(
          { length: X_TICK_COUNT },
          (_, i) =>
            (data.latestSnapshotAt ?? 0) -
            span +
            (span * i) / (X_TICK_COUNT - 1),
        );

  // Round percentages up from zero, over the activities shown.
  const yTicks = useMemo(() => {
    let max = 0;
    for (const row of rows) {
      for (const key of visible) max = Math.max(max, row[key] ?? 0);
    }
    return max > 0 ? niceTicks(0, max * 100) : [];
  }, [rows, visible]);
  const yLabel = tickFormatter(yTicks);

  const toggle = (key: CostIndexActivityKey) =>
    setVisible((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <Paper withBorder radius="md" p="sm" className={classes.root}>
      <Stack gap="sm">
        <Group justify="space-between" gap="xs">
          <Group gap={6} role="group" aria-label="Activities shown">
            {COST_INDEX_ACTIVITIES.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={classes.toggle}
                aria-pressed={visible.has(key)}
                onClick={() => toggle(key)}
              >
                <SeriesKey color={seriesColor(key)} />
                {label}
              </button>
            ))}
          </Group>
          <Segmented
            label="History range"
            value={range}
            onChange={setRange}
            data={RANGE_OPTIONS}
          />
        </Group>

        {error && (
          <Alert color="red" variant="light">
            Could not load the cost index history.
          </Alert>
        )}
        {isPending && <Skeleton height={CHART_HEIGHT} radius="sm" />}
        {data && rows.length === 0 && (
          <Text size="sm" c="dimmed">
            No cost indices recorded for this system in this range.
          </Text>
        )}
        {data && rows.length > 0 && (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <LineChart
              data={rows}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--chart-grid)"
                strokeWidth={1}
              />
              <XAxis
                dataKey="time"
                type="number"
                scale="time"
                // The whole range, so a gap at its start shows as one.
                domain={domain}
                ticks={xTicks}
                tickFormatter={(time: number) => ticks.format(time)}
                tickLine={false}
                axisLine={{ stroke: "var(--chart-grid)" }}
                tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
                minTickGap={32}
              />
              <YAxis
                width={56}
                ticks={yTicks.map((tick) => tick / 100)}
                domain={[0, (yTicks.at(-1) ?? 0) / 100 || "auto"]}
                interval={0}
                tickFormatter={(value: number) => `${yLabel(value * 100)}%`}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
              />
              <Tooltip
                cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }}
                isAnimationActive={false}
                content={
                  <HistoryTooltip
                    visible={visible}
                    daily={data.resolution === "day"}
                  />
                }
              />
              {COST_INDEX_ACTIVITIES.filter(({ key }) => visible.has(key)).map(
                ({ key }) => (
                  <Line
                    key={key}
                    dataKey={key}
                    type="stepAfter"
                    stroke={seriesColor(key)}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{
                      r: 4,
                      strokeWidth: 2,
                      stroke: "var(--mantine-color-body)",
                    }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                ),
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
        {data && <Caption history={data} />}
      </Stack>
    </Paper>
  );
}
