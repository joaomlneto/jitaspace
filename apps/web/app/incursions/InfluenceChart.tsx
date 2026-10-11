"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Box, Skeleton, Text } from "@mantine/core";

import { sampleInfluence } from "./math";

const AreaChart = dynamic(
  () => import("@mantine/charts").then((m) => m.AreaChart),
  { ssr: false, loading: () => <Skeleton h={130} /> },
);

const HOUR_MS = 60 * 60 * 1000;
const STEP_MS = 15 * 60 * 1000;
/** One axis label every 12 hours. */
const LABEL_EVERY = (12 * HOUR_MS) / STEP_MS;

/**
 * An incursion's influence over the last 72 hours, sampled every 15 minutes
 * from every change the tracking job recorded.
 */
export function InfluenceChart({
  readings,
  now,
  h = 130,
}: Readonly<{ readings: [number, number][]; now: number; h?: number }>) {
  const data = useMemo(
    () =>
      sampleInfluence(
        readings.map(([at, influence]) => ({ at, influence })),
        { now, stepMs: STEP_MS },
      ).map(({ at, influence }) => {
        const hoursAgo = Math.round((now - at) / HOUR_MS);
        return {
          label: hoursAgo === 0 ? "now" : `-${hoursAgo}h`,
          influence: influence === null ? null : influence * 100,
        };
      }),
    [readings, now],
  );

  if (readings.length === 0) {
    return (
      <Text size="xs" c="dimmed">
        No influence recorded yet.
      </Text>
    );
  }

  // Sized here, so the shorter loading skeleton does not shift the page.
  return (
    <Box h={h}>
      <AreaChart
        h={h}
        data={data}
        dataKey="label"
        series={[{ name: "influence", label: "Influence", color: "cyan.6" }]}
        curveType="stepAfter"
        connectNulls={false}
        withDots={false}
        gridAxis="y"
        tickLine="none"
        yAxisProps={{
          domain: [0, 100],
          ticks: [0, 25, 50, 75, 100],
          interval: 0,
          // Room for "100%"; narrower, the labels draw outside the chart.
          width: 44,
        }}
        // The first and last x labels ("-72h", "now") and the top y label are
        // centred on the plot's edges, so they need a margin to stay inside.
        areaChartProps={{ margin: { top: 8, right: 16, bottom: 0, left: 8 } }}
        xAxisProps={{ interval: LABEL_EVERY - 1 }}
        valueFormatter={(value) => `${value.toFixed(0)}%`}
      />
    </Box>
  );
}
