"use client";

import type { ReactNode } from "react";
import { memo, useMemo } from "react";
import dynamic from "next/dynamic";
import { Paper, Skeleton, Text } from "@mantine/core";

import type { PiCatalog } from "./catalog";
import type { ColonyRow, ColonyTotals, ProductionRow } from "./colonies";
import { formatNumber, PLANET_TYPES, planetTypeLabel } from "./cells";
import { COLONY_STATUS_COLORS, COLONY_STATUS_LABELS } from "./colonies";

const CHART_HEIGHT = 220;

// Loaded in the browser only, and after the rest of the page: the charts
// summarise the tables below them, so nothing waits on them.
const chartLoading = () => <Skeleton h={CHART_HEIGHT} />;
const BarChart = dynamic(
  () => import("@mantine/charts").then((m) => m.BarChart),
  { ssr: false, loading: chartLoading },
);
const DonutChart = dynamic(
  () => import("@mantine/charts").then((m) => m.DonutChart),
  { ssr: false, loading: chartLoading },
);

/**
 * A titled chart. The chart itself is labelled as one image with a text
 * summary, since screen readers cannot walk an SVG chart; the tables on the
 * page carry the same numbers.
 */
function ChartFigure({
  title,
  summary,
  isLoading,
  children,
}: Readonly<{
  title: string;
  summary: string;
  /** Holds the chart's place while its data loads, rather than drawing zeroes. */
  isLoading: boolean;
  children: ReactNode;
}>) {
  return (
    <Paper withBorder p="md" radius="md" component="figure" m={0}>
      <Text component="figcaption" fw={600} size="sm" mb="sm">
        {title}
      </Text>
      <div
        role="img"
        aria-label={`${title}: ${isLoading ? "loading" : summary}`}
      >
        {isLoading ? chartLoading() : children}
      </div>
    </Paper>
  );
}

export const ExtractorStatusChart = memo(
  ({
    totals,
    isLoading = false,
  }: Readonly<{ totals: ColonyTotals; isLoading?: boolean }>) => {
    const data = useMemo(
      () =>
        (["running", "expiring", "expired", "idle"] as const)
          .filter((status) => totals.byStatus[status] > 0)
          .map((status) => ({
            name: COLONY_STATUS_LABELS[status],
            value: totals.byStatus[status],
            color: `${COLONY_STATUS_COLORS[status]}.6`,
          })),
      [totals],
    );
    const summary =
      data.length === 0
        ? "no extractors"
        : data.map((slice) => `${slice.value} ${slice.name}`).join(", ");
    return (
      <ChartFigure
        title="Extractor programs"
        summary={summary}
        isLoading={isLoading}
      >
        {data.length === 0 ? (
          <Text c="dimmed" size="sm" h={CHART_HEIGHT}>
            No extractors.
          </Text>
        ) : (
          <DonutChart
            data={data}
            h={CHART_HEIGHT}
            mx="auto"
            withLabelsLine
            withLabels
            chartLabel={`${totals.extractors} extractors`}
            tooltipDataSource="segment"
          />
        )}
      </ChartFigure>
    );
  },
);
ExtractorStatusChart.displayName = "ExtractorStatusChart";

export const ColoniesByTypeChart = memo(
  ({
    rows,
    isLoading = false,
  }: Readonly<{ rows: readonly ColonyRow[]; isLoading?: boolean }>) => {
    const data = useMemo(
      () =>
        PLANET_TYPES.map((type) => ({
          type: planetTypeLabel(type),
          Colonies: rows.filter((row) => row.planet_type === type).length,
        })).filter((entry) => entry.Colonies > 0),
      [rows],
    );
    const summary =
      data.length === 0
        ? "no colonies"
        : data.map((entry) => `${entry.Colonies} ${entry.type}`).join(", ");
    return (
      <ChartFigure
        title="Colonies by planet type"
        summary={summary}
        isLoading={isLoading}
      >
        <BarChart
          h={CHART_HEIGHT}
          data={data}
          dataKey="type"
          series={[{ name: "Colonies", color: "blue.6" }]}
          yAxisProps={{ allowDecimals: false }}
          tickLine="none"
        />
      </ChartFigure>
    );
  },
);
ColoniesByTypeChart.displayName = "ColoniesByTypeChart";

const COMPACT_FORMAT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/**
 * The processed commodities with the largest surplus per day. Raw resources
 * are left out: their volumes run to hundreds of thousands a day and would
 * flatten every product beside them. The table lists them.
 */
export const ProductionChart = memo(
  ({
    rows,
    catalog,
    limit = 10,
    isLoading = false,
  }: Readonly<{
    rows: readonly ProductionRow[];
    catalog: PiCatalog;
    limit?: number;
    isLoading?: boolean;
  }>) => {
    const data = useMemo(
      () =>
        rows
          .filter((row) => row.netPerHour > 0 && (row.tier ?? 0) > 0)
          .slice(0, limit)
          .map((row) => ({
            commodity: catalog.types[row.typeId]?.name ?? `Type ${row.typeId}`,
            "Units per day": Math.round(row.netPerHour * 24),
          })),
      [rows, catalog, limit],
    );
    const summary =
      data.length === 0
        ? "no surplus"
        : data
            .map(
              (entry) =>
                `${entry.commodity} ${formatNumber(entry["Units per day"])}`,
            )
            .join(", ");
    return (
      <ChartFigure
        title="Daily surplus, processed commodities"
        summary={summary}
        isLoading={isLoading}
      >
        {data.length === 0 ? (
          <Text c="dimmed" size="sm" h={CHART_HEIGHT}>
            No processed commodity is left over to export.
          </Text>
        ) : (
          <BarChart
            h={Math.max(CHART_HEIGHT, data.length * 28)}
            data={data}
            dataKey="commodity"
            orientation="vertical"
            yAxisProps={{ width: 150 }}
            valueFormatter={(value) => COMPACT_FORMAT.format(value)}
            series={[{ name: "Units per day", color: "teal.6" }]}
            tickLine="none"
          />
        )}
      </ChartFigure>
    );
  },
);
ProductionChart.displayName = "ProductionChart";
