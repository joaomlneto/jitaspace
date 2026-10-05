/**
 * The market price history chart's model, kept free of React and Recharts so it
 * can be tested on plain numbers.
 *
 * It mirrors the in-game market history graph: median day price, the day's
 * min/max, 5- and 20-day moving averages, a Donchian channel and volume.
 */

/** One day of `GET /markets/{region_id}/history`, as ESI returns it. */
export interface MarketHistoryDay {
  /**
   * The day's typical traded price. ESI calls it `average`; the game client
   * plots the same number as "Median Day Price", which is what we label it.
   */
  average: number;
  /** `YYYY-MM-DD`, in UTC (EVE time). */
  date: string;
  highest: number;
  lowest: number;
  order_count: number;
  volume: number;
}

export interface PriceHistoryPoint {
  /** UTC midnight of the day, in epoch milliseconds: the chart's x value. */
  time: number;
  date: string;
  median: number;
  low: number;
  high: number;
  /** `[low, high]`, the shape a Recharts range bar reads. */
  range: [number, number];
  /** Absent until the window has a full span of history behind it. */
  ma5?: number;
  ma20?: number;
  /** `[lowest low, highest high]` over the channel's window. */
  donchian?: [number, number];
  volume: number;
  orders: number;
}

export const DAY_MS = 24 * 60 * 60 * 1000;
export const SHORT_MOVING_AVERAGE_DAYS = 5;
export const LONG_MOVING_AVERAGE_DAYS = 20;
/** The in-game graph's channel is short, so it hugs the price. */
export const DONCHIAN_DAYS = 5;

export const PRICE_HISTORY_RANGES = ["1m", "3m", "6m", "1y", "all"] as const;
export type PriceHistoryRange = (typeof PRICE_HISTORY_RANGES)[number];

const RANGE_DAYS: Record<PriceHistoryRange, number> = {
  "1m": 30,
  "3m": 91,
  "6m": 182,
  "1y": 365,
  all: Number.POSITIVE_INFINITY,
};

export function parseHistoryDate(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

/**
 * The days within the `days` calendar days ending at `index` (inclusive), or
 * `undefined` while the history does not reach back that far. Windows are
 * measured in calendar days, not rows: ESI omits days with no trades, so
 * "the last 5 rows" of a thinly traded item can span weeks.
 */
function windowEndingAt(
  points: PriceHistoryPoint[],
  index: number,
  days: number,
): PriceHistoryPoint[] | undefined {
  const end = points[index];
  const first = points[0];
  if (!end || !first) return undefined;
  const start = end.time - (days - 1) * DAY_MS;
  if (start < first.time) return undefined;

  const window: PriceHistoryPoint[] = [];
  for (let i = index; i >= 0; i--) {
    const point = points[i];
    if (!point || point.time < start) break;
    window.push(point);
  }
  return window;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Turn ESI's history rows into chart points, sorted by day, with every
 * indicator computed over the whole history. Slice afterwards (see
 * {@link sliceToRange}) so the first point of a range still has its averages.
 */
export function buildPriceHistory(
  days: readonly MarketHistoryDay[],
): PriceHistoryPoint[] {
  const points: PriceHistoryPoint[] = days
    .map((day) => ({
      time: parseHistoryDate(day.date),
      date: day.date,
      median: day.average,
      low: day.lowest,
      high: day.highest,
      range: [day.lowest, day.highest] as [number, number],
      volume: day.volume,
      orders: day.order_count,
    }))
    .filter((point) => Number.isFinite(point.time))
    .sort((a, b) => a.time - b.time);

  points.forEach((point, index) => {
    const short = windowEndingAt(points, index, SHORT_MOVING_AVERAGE_DAYS);
    if (short) point.ma5 = mean(short.map((p) => p.median));

    const long = windowEndingAt(points, index, LONG_MOVING_AVERAGE_DAYS);
    if (long) point.ma20 = mean(long.map((p) => p.median));

    const channel = windowEndingAt(points, index, DONCHIAN_DAYS);
    if (channel) {
      point.donchian = [
        Math.min(...channel.map((p) => p.low)),
        Math.max(...channel.map((p) => p.high)),
      ];
    }
  });

  return points;
}

/**
 * The points within `range` of the most recent day. Measured from the last
 * day traded rather than from today, so the newest data is always in view.
 */
export function sliceToRange(
  points: PriceHistoryPoint[],
  range: PriceHistoryRange,
): PriceHistoryPoint[] {
  const last = points.at(-1);
  if (!last) return [];
  const start = last.time - (RANGE_DAYS[range] - 1) * DAY_MS;
  return points.filter((point) => point.time >= start);
}

export interface PriceHistorySummary {
  latest: PriceHistoryPoint;
  /** Fractional change of the median price across the range, e.g. `0.12`. */
  change?: number;
  /** Units traded per calendar day across the range, idle days included. */
  averageDailyVolume: number;
}

export function summarizeRange(
  points: PriceHistoryPoint[],
): PriceHistorySummary | undefined {
  const first = points[0];
  const latest = points.at(-1);
  if (!first || !latest) return undefined;

  const calendarDays = (latest.time - first.time) / DAY_MS + 1;
  const totalVolume = points.reduce((sum, point) => sum + point.volume, 0);

  return {
    latest,
    change:
      points.length > 1 && first.median > 0
        ? latest.median / first.median - 1
        : undefined,
    averageDailyVolume: totalVolume / calendarDays,
  };
}

/** More ticks than any axis here asks for; a bound, not a target. */
const MAX_TICKS = 50;

/** The nearest of 1, 2, 2.5 or 5 (times a power of ten) at or above `step`. */
function niceStep(step: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(step));
  const fraction = step / magnitude;
  const nice = [1, 2, 2.5, 5, 10].find((candidate) => fraction <= candidate);
  return (nice ?? 10) * magnitude;
}

/**
 * Round axis ticks covering `[min, max]`: about `count` of them, on steps of 1,
 * 2, 2.5 or 5 times a power of ten (3.50 / 3.75 / 4.00, never 3.15 / 3.60). The
 * first and last ticks are the axis domain.
 */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) {
    // A flat series still needs an axis with some height.
    const pad = Math.abs(min) * 0.05 || 1;
    return niceTicks(min - pad, max + pad, count);
  }

  const step = niceStep((max - min) / Math.max(count - 1, 1));
  const first = Math.floor(min / step) * step;
  const last = Math.ceil(max / step) * step;
  // Decimal places in the step, so 0.1 + 0.2 lands on 0.3, not 0.30000000000000004.
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 1);

  // Indexed rather than accumulated (`tick += step`): where the step falls
  // below the float spacing at that magnitude, an addition is a no-op and the
  // loop would never end. The cap bounds it whatever the inputs.
  const steps = Math.min(Math.round((last - first) / step), MAX_TICKS - 1);
  return Array.from({ length: steps + 1 }, (_, index) =>
    Number((first + index * step).toFixed(decimals)),
  );
}

type PriceSeriesId = "median" | "range" | "ma5" | "ma20" | "donchian";

/** The lowest and highest price any of the `visible` series plots. */
export function visiblePriceExtent(
  points: PriceHistoryPoint[],
  visible: ReadonlySet<PriceSeriesId>,
): [number, number] | undefined {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  const include = (value: number | undefined) => {
    if (value === undefined) return;
    min = Math.min(min, value);
    max = Math.max(max, value);
  };

  for (const point of points) {
    if (visible.has("median")) include(point.median);
    if (visible.has("range")) {
      include(point.low);
      include(point.high);
    }
    if (visible.has("ma5")) include(point.ma5);
    if (visible.has("ma20")) include(point.ma20);
    if (visible.has("donchian")) {
      include(point.donchian?.[0]);
      include(point.donchian?.[1]);
    }
  }
  return min <= max ? [min, max] : undefined;
}

/**
 * A formatter for {@link niceTicks}' labels: every label with the step's
 * decimal places (3.50 / 3.75 / 4.00, not 3.5 / 3.75 / 4), switching to
 * compact notation (12.5K, 4B) once the values are large.
 */
export function tickFormatter(ticks: number[]): (value: number) => string {
  const [first, second] = ticks;
  const largest = Math.max(...ticks.map(Math.abs));
  if (largest >= 10_000 || first === undefined || second === undefined) {
    const compact = new Intl.NumberFormat(undefined, {
      notation: "compact",
      maximumFractionDigits: 2,
    });
    return (value) => compact.format(value);
  }

  const step = Number((second - first).toPrecision(6));
  const decimals = step.toString().split(".")[1]?.length ?? 0;
  const fixed = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (value) => fixed.format(value);
}
