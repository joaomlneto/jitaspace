"use client";

import type { CSSProperties, ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Group,
  Paper,
  SegmentedControl,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
} from "@mantine/core";
import { keepPreviousData } from "@tanstack/react-query";
import { parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DataTableColumn } from "@jitaspace/datatable";
import {
  useGetMarketsRegionIdHistory,
  useGetUniverseRegions,
} from "@jitaspace/esi-client";
import { MARKET_HUB_REGION_IDS, useEsiNameLookup } from "@jitaspace/hooks";

import type {
  PriceHistoryPoint,
  PriceHistoryRange,
  PriceHistorySummary,
} from "./priceHistory";
import { DataTable } from "~/components/DataTable";
import { formatIsk } from "./MarketOrdersDataTable";
import classes from "./MarketPriceHistory.module.css";
import {
  buildPriceHistory,
  DONCHIAN_DAYS,
  LONG_MOVING_AVERAGE_DAYS,
  niceTicks,
  PRICE_HISTORY_RANGES,
  SHORT_MOVING_AVERAGE_DAYS,
  sliceToRange,
  summarizeRange,
  tickFormatter,
  visiblePriceExtent,
} from "./priceHistory";

/**
 * Labels for the trade hubs' regions, which are offered first: almost all
 * trade happens there. Which regions are hubs, and their order, comes from
 * `MARKET_HUB_REGION_IDS`, the list the order tables fetch first; a hub
 * missing here falls back to its ESI name.
 */
const HUB_LABELS: Partial<Record<number, string>> = {
  10000002: "The Forge (Jita)",
  10000043: "Domain (Amarr)",
  10000032: "Sinq Laison (Dodixie)",
  10000030: "Heimatar (Rens)",
  10000042: "Metropolis (Hek)",
};
const DEFAULT_REGION_ID = MARKET_HUB_REGION_IDS[0] ?? 10000002;
/** Wormhole and Abyssal regions start here, and have no market. */
const FIRST_NON_MARKET_REGION_ID = 11000000;

const RANGE_OPTIONS: { value: PriceHistoryRange; label: string }[] = [
  { value: "1m", label: "1M" },
  { value: "3m", label: "3M" },
  { value: "6m", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "all", label: "All" },
];

const SERIES = [
  { id: "median", label: "Median day price", shape: "line" },
  { id: "range", label: "Min/max", shape: "bar" },
  {
    id: "ma5",
    label: `${SHORT_MOVING_AVERAGE_DAYS}-day average`,
    shape: "line",
  },
  {
    id: "ma20",
    label: `${LONG_MOVING_AVERAGE_DAYS}-day average`,
    shape: "line",
  },
  {
    id: "donchian",
    label: `Donchian channel (${DONCHIAN_DAYS}d)`,
    shape: "band",
  },
] as const;
type SeriesId = (typeof SERIES)[number]["id"];

const SERIES_COLOR: Record<SeriesId, string> = {
  median: "var(--series-median)",
  range: "var(--series-range)",
  ma5: "var(--series-ma-short)",
  ma20: "var(--series-ma-long)",
  donchian: "var(--series-donchian)",
};

const PRICE_CHART_HEIGHT = 300;
const VOLUME_CHART_HEIGHT = 120;
/** Keeps the two charts' plot areas aligned, whatever their tick labels. */
const Y_AXIS_WIDTH = 64;

const compactNumber = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 2,
});
const shortDate = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const longDate = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function SeriesKey({
  color,
  shape,
}: Readonly<{ color: string; shape: "line" | "band" | "bar" }>) {
  return (
    <span
      aria-hidden
      className={classes.key}
      data-shape={shape}
      style={{ "--key-color": color } as CSSProperties}
    />
  );
}

/**
 * One readout for every series at the hovered day: values lead, labels follow,
 * each keyed by a short stroke of its colour.
 */
function HistoryTooltip({
  point,
  visible,
}: Readonly<{ point?: PriceHistoryPoint; visible: Set<SeriesId> }>) {
  if (!point) return null;

  const rows: { key: string; label: string; value: string; color?: string }[] =
    [];
  if (visible.has("median")) {
    rows.push({
      key: "median",
      label: "Median",
      value: formatIsk(point.median),
      color: SERIES_COLOR.median,
    });
  }
  if (visible.has("range")) {
    rows.push(
      {
        key: "high",
        label: "Max",
        value: formatIsk(point.high),
        color: SERIES_COLOR.range,
      },
      {
        key: "low",
        label: "Min",
        value: formatIsk(point.low),
        color: SERIES_COLOR.range,
      },
    );
  }
  if (visible.has("ma5") && point.ma5 !== undefined) {
    rows.push({
      key: "ma5",
      label: `${SHORT_MOVING_AVERAGE_DAYS}d avg`,
      value: formatIsk(point.ma5),
      color: SERIES_COLOR.ma5,
    });
  }
  if (visible.has("ma20") && point.ma20 !== undefined) {
    rows.push({
      key: "ma20",
      label: `${LONG_MOVING_AVERAGE_DAYS}d avg`,
      value: formatIsk(point.ma20),
      color: SERIES_COLOR.ma20,
    });
  }
  if (visible.has("donchian") && point.donchian) {
    rows.push({
      key: "donchian",
      label: "Donchian",
      value: `${compactNumber.format(point.donchian[0])} – ${compactNumber.format(point.donchian[1])}`,
      color: SERIES_COLOR.donchian,
    });
  }
  rows.push(
    {
      key: "volume",
      label: "Volume",
      value: point.volume.toLocaleString(),
    },
    { key: "orders", label: "Orders", value: point.orders.toLocaleString() },
  );

  return (
    <Paper
      withBorder
      shadow="md"
      p="xs"
      radius="md"
      className={classes.tooltip}
    >
      <Text size="xs" c="dimmed" mb={4}>
        {longDate.format(point.time)}
      </Text>
      {rows.map((row) => (
        <div key={row.key} className={classes.tooltipRow}>
          {row.color ? (
            <SeriesKey color={row.color} shape="line" />
          ) : (
            <span style={{ width: 14 }} />
          )}
          <Text size="xs" c="dimmed">
            {row.label}
          </Text>
          <Text size="xs" className={classes.tooltipValue}>
            {row.value}
          </Text>
        </div>
      ))}
    </Paper>
  );
}

function Stat({
  label,
  value,
  hint,
}: Readonly<{ label: string; value: string; hint: string }>) {
  return (
    <Paper withBorder p={{ base: "xs", sm: "sm" }} radius="md" miw={0}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={700} truncate>
        {label}
      </Text>
      {/* Three across even on a phone, so the value steps down a size there
          and the hint, which would only be truncated, is left out. */}
      <Text fw={700} fz={{ base: "md", sm: "lg" }} truncate>
        {value}
      </Text>
      <Text size="xs" c="dimmed" truncate visibleFrom="sm">
        {hint}
      </Text>
    </Paper>
  );
}

const tableColumns: DataTableColumn<PriceHistoryPoint>[] = [
  {
    id: "date",
    header: "Date",
    accessor: "time",
    sortable: true,
    cell: (point) => point.date,
  },
  {
    id: "median",
    header: "Median",
    accessor: "median",
    sortable: true,
    align: "right",
    cell: (point) => formatIsk(point.median),
  },
  {
    id: "low",
    header: "Min",
    accessor: "low",
    sortable: true,
    align: "right",
    cell: (point) => formatIsk(point.low),
  },
  {
    id: "high",
    header: "Max",
    accessor: "high",
    sortable: true,
    align: "right",
    cell: (point) => formatIsk(point.high),
  },
  {
    id: "volume",
    header: "Volume",
    accessor: "volume",
    sortable: true,
    align: "right",
    cell: (point) => point.volume.toLocaleString(),
  },
  {
    id: "orders",
    header: "Orders",
    accessor: "orders",
    sortable: true,
    align: "right",
    cell: (point) => point.orders.toLocaleString(),
  },
];

/**
 * The region to chart for the one in the URL. A hand-edited or stale URL must
 * not reach ESI with an id that has no market, so anything that isn't a market
 * region falls back to the default hub. `undefined` while the region list is
 * still loading, unless the id is a hub, which needs no list to trust.
 */
function resolveRegionId(
  requestedRegionId: number,
  marketRegionIds: ReadonlySet<number> | undefined,
): number | undefined {
  if (MARKET_HUB_REGION_IDS.includes(requestedRegionId)) {
    return requestedRegionId;
  }
  if (marketRegionIds === undefined) return undefined;
  return marketRegionIds.has(requestedRegionId)
    ? requestedRegionId
    : DEFAULT_REGION_ID;
}

/** A fractional change as a signed percentage with a direction arrow. */
function formatChange(change: number | undefined): string {
  if (change === undefined) return "—";
  const arrow = change >= 0 ? "▲ +" : "▼ ";
  return `${arrow}${(change * 100).toFixed(1)}%`;
}

/**
 * The price chart's tooltip, as Recharts renders it: it clones this element
 * with the hovered `active` state and `payload`.
 */
function HistoryTooltipContent({
  active,
  payload,
  visible,
}: Readonly<{
  active?: boolean;
  payload?: readonly { payload?: unknown }[];
  visible: Set<SeriesId>;
}>) {
  if (!active) return null;
  return (
    <HistoryTooltip
      point={payload?.[0]?.payload as PriceHistoryPoint | undefined}
      visible={visible}
    />
  );
}

/** The volume chart shows the cursor only; the price chart's readout covers both. */
function NoTooltip() {
  return null;
}

const X_AXIS_PROPS = {
  dataKey: "time",
  type: "number",
  scale: "time",
  domain: ["dataMin", "dataMax"],
  tickFormatter: (time: number) => shortDate.format(time),
  tickLine: false,
  axisLine: { stroke: "var(--chart-grid)" },
  tick: { fill: "var(--chart-axis)", fontSize: 11 },
  minTickGap: 32,
} as const;
const Y_AXIS_PROPS = {
  width: Y_AXIS_WIDTH,
  // The ticks are ours and few (`niceTicks`): show every one. Recharts'
  // default thinning drops the label sitting on the plot's bottom edge.
  interval: 0,
  tickLine: false,
  axisLine: false,
  tick: { fill: "var(--chart-axis)", fontSize: 11 },
} as const;
const CURSOR = { stroke: "var(--chart-axis)", strokeWidth: 1 };

function HistoryLoading() {
  return (
    <Stack gap="md">
      <SimpleGrid cols={3} spacing={{ base: 6, sm: "sm" }}>
        <Skeleton h={78} />
        <Skeleton h={78} />
        <Skeleton h={78} />
      </SimpleGrid>
      <Skeleton h={PRICE_CHART_HEIGHT + VOLUME_CHART_HEIGHT + 48} />
    </Stack>
  );
}

function HistorySummary({
  summary,
  tradingDays,
}: Readonly<{ summary: PriceHistorySummary; tradingDays: number }>) {
  return (
    <SimpleGrid cols={3} spacing={{ base: 6, sm: "sm" }}>
      <Stat
        label="Median"
        value={formatIsk(summary.latest.median)}
        hint={`latest, ${longDate.format(summary.latest.time)}`}
      />
      <Stat
        label="Change"
        value={formatChange(summary.change)}
        hint={`median, over ${tradingDays.toLocaleString()} trading days`}
      />
      <Stat
        label="Volume/day"
        value={compactNumber.format(summary.averageDailyVolume)}
        hint="units traded per day, on average"
      />
    </SimpleGrid>
  );
}

/**
 * The price chart above the volume chart, with the series toggles that double
 * as its legend.
 */
function HistoryCharts({
  points,
  visible,
  onToggle,
}: Readonly<{
  points: PriceHistoryPoint[];
  visible: Set<SeriesId>;
  onToggle: (id: SeriesId) => void;
}>) {
  const priceTicks = useMemo(() => {
    const extent = visiblePriceExtent(points, visible);
    return extent ? niceTicks(extent[0], extent[1]) : [];
  }, [points, visible]);
  const volumeTicks = useMemo(
    () => niceTicks(0, Math.max(0, ...points.map((point) => point.volume)), 3),
    [points],
  );

  return (
    <Paper withBorder radius="md" p="sm">
      <Group gap={6} mb="sm" role="group" aria-label="Series shown">
        {SERIES.map((series) => (
          <button
            key={series.id}
            type="button"
            className={classes.toggle}
            aria-pressed={visible.has(series.id)}
            onClick={() => onToggle(series.id)}
          >
            <SeriesKey color={SERIES_COLOR[series.id]} shape={series.shape} />
            {series.label}
          </button>
        ))}
      </Group>

      <ResponsiveContainer width="100%" height={PRICE_CHART_HEIGHT}>
        <ComposedChart
          data={points}
          syncId="market-price-history"
          // Room for the top and bottom tick labels: with its x-axis hidden,
          // Recharts drops a label that would overflow.
          margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--chart-grid)"
            strokeWidth={1}
          />
          <XAxis {...X_AXIS_PROPS} hide />
          <YAxis
            {...Y_AXIS_PROPS}
            ticks={priceTicks}
            tickFormatter={tickFormatter(priceTicks)}
            domain={[priceTicks[0] ?? "auto", priceTicks.at(-1) ?? "auto"]}
          />
          {/* The one readout for both charts: hovering the volume chart moves
              this one's cursor too, through `syncId`. */}
          <Tooltip
            cursor={CURSOR}
            isAnimationActive={false}
            content={<HistoryTooltipContent visible={visible} />}
          />
          {visible.has("donchian") && (
            <Area
              dataKey="donchian"
              stroke={SERIES_COLOR.donchian}
              strokeWidth={1}
              strokeOpacity={0.6}
              fill={SERIES_COLOR.donchian}
              fillOpacity={0.1}
              isAnimationActive={false}
              activeDot={false}
            />
          )}
          {visible.has("range") && (
            <Bar
              dataKey="range"
              fill={SERIES_COLOR.range}
              fillOpacity={0.55}
              barSize={2}
              isAnimationActive={false}
            />
          )}
          {visible.has("ma20") && (
            <Line
              dataKey="ma20"
              stroke={SERIES_COLOR.ma20}
              strokeWidth={2}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          )}
          {visible.has("ma5") && (
            <Line
              dataKey="ma5"
              stroke={SERIES_COLOR.ma5}
              strokeWidth={2}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          )}
          {visible.has("median") && (
            <Line
              dataKey="median"
              stroke={SERIES_COLOR.median}
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 4,
                strokeWidth: 2,
                stroke: "var(--mantine-color-body)",
              }}
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      <Text size="xs" c="dimmed" mt="xs" ml={Y_AXIS_WIDTH}>
        Volume (units)
      </Text>
      <ResponsiveContainer width="100%" height={VOLUME_CHART_HEIGHT}>
        <ComposedChart
          data={points}
          syncId="market-price-history"
          margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--chart-grid)"
            strokeWidth={1}
          />
          <XAxis {...X_AXIS_PROPS} />
          <YAxis
            {...Y_AXIS_PROPS}
            ticks={volumeTicks}
            tickFormatter={tickFormatter(volumeTicks)}
            domain={[0, volumeTicks.at(-1) ?? "auto"]}
          />
          <Tooltip cursor={CURSOR} content={<NoTooltip />} />
          <Bar
            dataKey="volume"
            fill={SERIES_COLOR.median}
            fillOpacity={0.7}
            radius={[2, 2, 0, 0]}
            maxBarSize={24}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Paper>
  );
}

/** Every day in the range as a table, newest first, behind a toggle. */
function DailyData({ points }: Readonly<{ points: PriceHistoryPoint[] }>) {
  const [showTable, setShowTable] = useState(false);
  const newestFirst = useMemo(() => [...points].reverse(), [points]);

  return (
    <div>
      <Button
        variant="subtle"
        size="xs"
        onClick={() => setShowTable((shown) => !shown)}
        aria-expanded={showTable}
      >
        {showTable ? "Hide daily data" : "Show daily data"}
      </Button>
      {showTable && (
        <DataTable
          data={newestFirst}
          columns={tableColumns}
          rowId={(point) => point.time}
          withPagination
          defaultPageSize={20}
          initialSort={{ columnId: "date", direction: "desc" }}
          verticalSpacing="xs"
          striped
        />
      )}
    </div>
  );
}

/**
 * A type's daily market history in one region, as the in-game market window
 * plots it: median day price with the day's min/max, two moving averages and a
 * Donchian channel above, and volume below.
 *
 * Volume is its own chart sharing the time axis, never a second y-axis on the
 * price chart: two scales on one plot invent a correlation by where they happen
 * to line up. The charts share a hover, so the readout covers both.
 */
export function MarketPriceHistory({ typeId }: Readonly<{ typeId: number }>) {
  // Namespaced: this component lives in ~/components, and a host page may
  // own a `region` or `range` of its own.
  const [{ region: requestedRegionId, range }, setParams] = useQueryStates(
    {
      region: parseAsInteger.withDefault(DEFAULT_REGION_ID),
      range: parseAsStringLiteral(PRICE_HISTORY_RANGES).withDefault("6m"),
    },
    { urlKeys: { region: "historyRegion", range: "historyRange" } },
  );
  // The channel is one click away rather than on: with the min/max bars and
  // both averages it buried the median line.
  const [visible, setVisible] = useState<Set<SeriesId>>(
    () => new Set(["median", "range", "ma5", "ma20"]),
  );

  const { regionOptions, marketRegionIds } = useRegionOptions();
  const regionId = resolveRegionId(requestedRegionId, marketRegionIds);

  const {
    data,
    isLoading: isHistoryLoading,
    isError,
    isPlaceholderData,
  } = useGetMarketsRegionIdHistory(
    regionId,
    { type_id: typeId },
    undefined,
    // Switching region or type keeps the previous chart up, dimmed, rather
    // than swapping everything for skeletons and back.
    { query: { placeholderData: keepPreviousData } },
  );
  const allPoints = useMemo(() => buildPriceHistory(data?.data ?? []), [data]);
  const points = useMemo(
    () => sliceToRange(allPoints, range),
    [allPoints, range],
  );
  const summary = useMemo(() => summarizeRange(points), [points]);

  const regionLabel =
    regionOptions
      .flatMap((group) => group.items)
      .find((option) => option.value === regionId?.toString())?.label ??
    "this region";

  const toggle = (id: SeriesId) =>
    setVisible((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  let body: ReactNode;
  if (isError) {
    body = (
      <Alert color="red" variant="light">
        Could not load the price history. ESI may be having a moment; try again
        shortly.
      </Alert>
    );
  } else if (regionId === undefined || isHistoryLoading) {
    body = <HistoryLoading />;
  } else if (summary) {
    body = (
      <Stack
        gap="md"
        aria-busy={isPlaceholderData}
        style={{
          opacity: isPlaceholderData ? 0.55 : 1,
          transition: "opacity 150ms ease",
        }}
      >
        <HistorySummary summary={summary} tradingDays={points.length} />
        <HistoryCharts points={points} visible={visible} onToggle={toggle} />
        <DailyData points={points} />
      </Stack>
    );
  } else {
    body = (
      <Text c="dimmed" size="sm">
        {`No trades in ${regionLabel} over the past year.`}
      </Text>
    );
  }

  return (
    <Stack gap="md" className={classes.root}>
      <Group justify="space-between" gap="sm">
        <Select
          aria-label="Region"
          data={regionOptions}
          value={(regionId ?? requestedRegionId).toString()}
          onChange={(value) => {
            if (value) void setParams({ region: Number(value) });
          }}
          searchable
          allowDeselect={false}
          w={{ base: "100%", xs: 260 }}
        />
        <SegmentedControl
          aria-label="Time range"
          size="xs"
          data={RANGE_OPTIONS}
          value={range}
          onChange={(value) => void setParams({ range: value })}
        />
      </Group>
      {body}
    </Stack>
  );
}

/**
 * Region choices: the hubs first, then every other region with a market. Also
 * the set of those regions' ids, `undefined` until ESI has listed them (and
 * empty if it could not).
 */
function useRegionOptions() {
  const { data, isError } = useGetUniverseRegions();
  const marketRegionIds = useMemo(() => {
    if (data) {
      return new Set(data.data.filter((id) => id < FIRST_NON_MARKET_REGION_ID));
    }
    // Without the list, no region outside the hubs can be trusted.
    if (isError) return new Set<number>();
    return undefined;
  }, [data, isError]);
  const otherRegionIds = useMemo(
    () =>
      [...(marketRegionIds ?? [])].filter(
        (id) => !MARKET_HUB_REGION_IDS.includes(id),
      ),
    [marketRegionIds],
  );
  // Fetched in one batched /universe/names call, in the reader's ESI language,
  // through the shared name cache. (Bare `useEsiNames` only reads that cache.)
  const nameEntries = useMemo(
    () =>
      [
        ...MARKET_HUB_REGION_IDS.filter((id) => HUB_LABELS[id] === undefined),
        ...otherRegionIds,
      ].map((id) => ({ id, category: "region" as const })),
    [otherRegionIds],
  );
  const names = useEsiNameLookup(nameEntries);

  const regionOptions = useMemo(() => {
    const option = (id: number) => ({
      value: id.toString(),
      label:
        HUB_LABELS[id] ?? names[id.toString()]?.value?.name ?? `Region ${id}`,
    });
    const others = otherRegionIds
      .map(option)
      .sort((a, b) => a.label.localeCompare(b.label));
    return [
      { group: "Trade hubs", items: MARKET_HUB_REGION_IDS.map(option) },
      { group: "All regions", items: others },
    ];
  }, [otherRegionIds, names]);

  return { regionOptions, marketRegionIds };
}
