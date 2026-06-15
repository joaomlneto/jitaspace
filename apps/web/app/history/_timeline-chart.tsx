"use client";

import { useMemo } from "react";
import { BarChart } from "@mantine/charts";
import { Group, Paper, Text, Title } from "@mantine/core";

import type { HistoryBuild } from "./_timeline-chart.logic";
import {
  buildTimelineChartModel,
  formatWeekTick,
} from "./_timeline-chart.logic";

/**
 * Stacked weekly bar chart of static-data changes across the whole timeline.
 * Each bar is one ISO week, split by collection. The parent's collection-filter
 * chips drive `collections`, so checking/unchecking a chip adds/removes its
 * series here — the chart and the build list stay in lockstep.
 */
export function HistoryTimelineChart({
  builds,
  collections,
}: Readonly<{ builds: HistoryBuild[]; collections: string[] }>) {
  // Re-fold only when the data or the active-collection set actually changes
  // (the parent hands us a fresh `collections` array on every render).
  const activeKey = [...collections].sort().join(",");
  const model = useMemo(
    () =>
      buildTimelineChartModel(builds, activeKey ? activeKey.split(",") : []),
    [builds, activeKey],
  );

  return (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between" align="baseline" mb="sm">
        <Title order={4}>Activity over time</Title>
        {model.totalChanges > 0 && (
          <Text size="xs" c="dimmed">
            {model.totalChanges.toLocaleString()} changes across{" "}
            {model.data.length.toLocaleString()} weeks
          </Text>
        )}
      </Group>

      {model.series.length === 0 ? (
        <Text size="sm" c="dimmed">
          No dated changes in the selected categories.
        </Text>
      ) : (
        <BarChart
          h={160}
          data={model.data}
          dataKey="week"
          type="stacked"
          series={model.series}
          tickLine="y"
          gridAxis="y"
          strokeDasharray="3 3"
          maxBarWidth={36}
          valueFormatter={(value) => value.toLocaleString()}
          xAxisProps={{
            tickFormatter: formatWeekTick,
            minTickGap: 40,
            interval: "preserveStartEnd",
          }}
        />
      )}
    </Paper>
  );
}
