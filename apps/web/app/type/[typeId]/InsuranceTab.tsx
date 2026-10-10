"use client";

import { useMemo } from "react";
import {
  Alert,
  Anchor,
  Group,
  NativeSelect,
  Paper,
  Skeleton,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { IconChartLine, IconShieldCheck } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DataTableColumn } from "@jitaspace/datatable";

import type {
  InsuranceChartPoint,
  InsuranceLevelKey,
  InsurancePricePeriod,
  TypeInsuranceHistory,
} from "~/lib/insurance";
import { DataTable } from "~/components/DataTable";
import { SectionHeading } from "~/components/EntityPage";
import { niceTicks, tickFormatter } from "~/components/Market/priceHistory";
import { Segmented } from "~/components/Wars/WarRoom/parts";
import { INSURANCE_LEVELS, toInsuranceChartPoints } from "~/lib/insurance";
import {
  insuranceHistoryParsers,
  insuranceHistoryUrlKeys,
} from "./insuranceParams";
import classes from "./InsuranceTab.module.css";

const CHART_HEIGHT = 260;

const VIEW_OPTIONS = [
  { value: "chart", label: "Chart" },
  { value: "table", label: "Table" },
] as const;
const TIER_OPTIONS = INSURANCE_LEVELS.map(({ key, name }) => ({
  value: key,
  label: name,
}));

// A fixed locale and time zone: the tab can render on the server (a
// `?tab=insurance` link), and the client must produce the same text.
const iskFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});
const monthYear = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const dayMonth = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
/** Over a year or more, ticks are months apart; closer, several share one. */
const LONG_SPAN_MS = 365 * 24 * 60 * 60 * 1000;

/** A table cell: the column header carries the unit, and nothing wraps. */
const cellText = (text: string) => (
  <span className={classes.nowrap}>{text}</span>
);
const amount = (value: number | null) =>
  value === null ? "—" : iskFormat.format(value);

const isk = (amount: number | null) =>
  amount === null ? "—" : `${iskFormat.format(amount)} ISK`;
/** EVE time is UTC. */
const eveTime = (iso: string) => `${dateTimeFormat.format(new Date(iso))} UTC`;

/** The type's insurance history, from the CDN-cached API route. */
function useTypeInsuranceHistory(typeId: number) {
  return useQuery({
    queryKey: ["type-insurance", typeId],
    queryFn: async (): Promise<TypeInsuranceHistory> => {
      const response = await fetch(`/api/type/${typeId}/insurance`);
      if (!response.ok) {
        throw new Error(`Insurance for ${typeId}: HTTP ${response.status}`);
      }
      return (await response.json()) as TypeInsuranceHistory;
    },
    staleTime: Infinity,
  });
}

/** Every level's premium, payout and what a loss nets, for one period. */
function InsuranceLevelsTable({
  period,
}: Readonly<{ period: InsurancePricePeriod }>) {
  return (
    <Table.ScrollContainer minWidth={420} type="native">
      <Table className={classes.numbers} verticalSpacing={6} withRowBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Level</Table.Th>
            <Table.Th ta="right">Cost (ISK)</Table.Th>
            <Table.Th ta="right">Payout (ISK)</Table.Th>
            <Table.Th ta="right">Payout − cost (ISK)</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {INSURANCE_LEVELS.map(({ key, name }) => {
            const { cost, payout } = period.levels[key];
            return (
              <Table.Tr key={key}>
                <Table.Td fw={600}>{name}</Table.Td>
                <Table.Td ta="right">{amount(cost)}</Table.Td>
                <Table.Td ta="right">{amount(payout)}</Table.Td>
                <Table.Td ta="right">
                  {amount(
                    cost === null || payout === null ? null : payout - cost,
                  )}
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

export function ChartTooltip({
  active,
  payload,
}: Readonly<{
  active?: boolean;
  payload?: readonly { payload?: InsuranceChartPoint }[];
}>) {
  const period = payload?.[0]?.payload?.period;
  if (!active || !period) return null;
  return (
    <Paper withBorder shadow="sm" p="xs" className={classes.tooltip}>
      <Text size="xs" c="dimmed" mb={4}>
        From {eveTime(period.validFrom)}
        <br />
        {period.validUntil ? `until ${eveTime(period.validUntil)}` : "to now"}
      </Text>
      {INSURANCE_LEVELS.map(({ key, name }) => (
        <div key={key} className={classes.tooltipRow}>
          <Text size="xs">{name}</Text>
          <Text size="xs" className={classes.tooltipValue}>
            {isk(period.levels[key].payout)}
          </Text>
          <Text size="xs" c="dimmed">
            for {isk(period.levels[key].cost)}
          </Text>
        </div>
      ))}
    </Paper>
  );
}

/**
 * One level's payout over time. The levels are fixed multiples of the same
 * value, so one line at a time says it all; the tooltip lists every level.
 */
function PayoutChart({
  history,
  tier,
  onTierChange,
}: Readonly<{
  history: TypeInsuranceHistory;
  tier: InsuranceLevelKey;
  onTierChange: (tier: InsuranceLevelKey) => void;
}>) {
  const points = useMemo(
    () => toInsuranceChartPoints(history.periods, history.lastObservedAt, tier),
    [history, tier],
  );
  const payouts = points.flatMap((point) => point.payout ?? []);
  const span = (points.at(-1)?.time ?? 0) - (points[0]?.time ?? 0);
  const tickDate = span >= LONG_SPAN_MS ? monthYear : dayMonth;
  const ticks = niceTicks(Math.min(...payouts), Math.max(...payouts));
  return (
    <Paper withBorder radius="md" p="sm" className={classes.root}>
      <Group justify="space-between" gap="xs" mb={4}>
        <Text size="sm" fw={600}>
          {INSURANCE_LEVELS.find(({ key }) => key === tier)?.name} payout
        </Text>
        <NativeSelect
          size="xs"
          aria-label="Insurance tier"
          data={TIER_OPTIONS}
          value={tier}
          onChange={(event) => {
            const value = TIER_OPTIONS.find(
              (option) => option.value === event.currentTarget.value,
            )?.value;
            if (value) onTierChange(value);
          }}
        />
      </Group>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <LineChart
          data={points}
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
            domain={["dataMin", "dataMax"]}
            tickFormatter={(time: number) => tickDate.format(time)}
            tickLine={false}
            axisLine={{ stroke: "var(--chart-grid)" }}
            tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
            minTickGap={32}
          />
          <YAxis
            width={64}
            interval={0}
            ticks={ticks}
            tickFormatter={tickFormatter(ticks)}
            domain={[ticks[0] ?? "auto", ticks.at(-1) ?? "auto"]}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
          />
          <Tooltip
            cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }}
            isAnimationActive={false}
            content={<ChartTooltip />}
          />
          <Line
            dataKey="payout"
            type="stepAfter"
            stroke="var(--series-payout)"
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 4,
              strokeWidth: 2,
              stroke: "var(--mantine-color-body)",
            }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );
}

const periodColumns: DataTableColumn<InsurancePricePeriod>[] = [
  {
    id: "validFrom",
    header: "From",
    accessor: (row) => Date.parse(row.validFrom),
    sortable: true,
    cell: (row) => cellText(eveTime(row.validFrom)),
  },
  {
    id: "validUntil",
    header: "Until",
    accessor: (row) => (row.validUntil ? Date.parse(row.validUntil) : null),
    sortable: true,
    cell: (row) => cellText(row.validUntil ? eveTime(row.validUntil) : "Now"),
  },
  ...INSURANCE_LEVELS.flatMap(
    ({ key, name }): DataTableColumn<InsurancePricePeriod>[] => [
      {
        id: `${key}Cost`,
        header: `${name} cost (ISK)`,
        accessor: (row) => row.levels[key].cost,
        sortable: true,
        align: "right",
        cell: (row) => cellText(amount(row.levels[key].cost)),
      },
      {
        id: `${key}Payout`,
        header: `${name} payout (ISK)`,
        accessor: (row) => row.levels[key].payout,
        sortable: true,
        align: "right",
        cell: (row) => cellText(amount(row.levels[key].payout)),
      },
    ],
  ),
];

/**
 * The Insurance tab of a ship: its current prices from the page, and its
 * price history, fetched when the tab opens.
 */
export function InsuranceTab({
  typeId,
  latest,
}: Readonly<{ typeId: number; latest: InsurancePricePeriod }>) {
  const { data: history, isError } = useTypeInsuranceHistory(typeId);
  const [{ view, tier }, setParams] = useQueryStates(insuranceHistoryParsers, {
    urlKeys: insuranceHistoryUrlKeys,
    history: "replace",
  });
  const isCurrent = latest.validUntil === null;

  return (
    <Stack gap="lg">
      <Stack gap="sm">
        <SectionHeading icon={<IconShieldCheck size={18} />}>
          {isCurrent ? "Current insurance" : "Last insurance prices"}
        </SectionHeading>
        {!isCurrent && latest.validUntil && (
          <Alert color="gray">
            ESI has not listed insurance for this item since{" "}
            {eveTime(latest.validUntil)}. These are the last prices it had.
          </Alert>
        )}
        <Paper withBorder radius="md" p="xs">
          <InsuranceLevelsTable period={latest} />
        </Paper>
        <Text size="xs" c="dimmed">
          Prices since {eveTime(latest.validFrom)}
          {history?.lastObservedAt
            ? `, last checked ${eveTime(history.lastObservedAt)}`
            : ""}
          . Insurance pays out on the ship&apos;s destruction; the cost buys
          twelve weeks of cover.
        </Text>
      </Stack>

      <Stack gap="sm">
        <Group justify="space-between" gap="xs">
          <SectionHeading icon={<IconChartLine size={18} />}>
            Price history
          </SectionHeading>
          <Segmented
            label="Show the price history as"
            value={view}
            onChange={(value) => void setParams({ view: value })}
            data={VIEW_OPTIONS}
          />
        </Group>
        {isError && (
          <Alert color="red">Could not load the price history.</Alert>
        )}
        {!history && !isError && (
          <Skeleton height={CHART_HEIGHT + 40} radius="md" />
        )}
        {history && history.periods.length > 0 && view === "chart" && (
          <PayoutChart
            history={history}
            tier={tier}
            onTierChange={(value) => void setParams({ tier: value })}
          />
        )}
        {history && history.periods.length > 0 && view === "table" && (
          <DataTable
            data={history.periods}
            columns={periodColumns}
            rowId={(row) => row.validFrom}
            withColumnVisibility
            withPagination
            defaultPageSize={10}
            initialSort={{ columnId: "validFrom", direction: "desc" }}
            verticalSpacing="xs"
            highlightOnHover
            striped
          />
        )}
        <Text size="xs" c="dimmed">
          Every level is a fixed multiple of the same value, so the chart shows
          one level at a time; hover it for the rest, or switch to the table.
          Recorded hourly from ESI; history before October 2026 comes from{" "}
          <Anchor
            href="https://data.everef.net/insurance-prices/"
            target="_blank"
            rel="noopener noreferrer"
            inherit
          >
            EVE Ref&apos;s archive
          </Anchor>
          , which starts in December 2022 and has a few gaps.
        </Text>
      </Stack>
    </Stack>
  );
}
