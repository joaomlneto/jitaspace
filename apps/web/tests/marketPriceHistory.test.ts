import { describe, expect, it } from "@jest/globals";

import type { MarketHistoryDay } from "~/components/Market/priceHistory";
import {
  buildPriceHistory,
  niceTicks,
  sliceToRange,
  summarizeRange,
  tickFormatter,
  visiblePriceExtent,
} from "~/components/Market/priceHistory";

/** A day in October 2026, `average` = `price`, with a ±1 min/max. */
function day(
  dayOfMonth: number,
  price: number,
  volume = 100,
): MarketHistoryDay {
  return {
    date: `2026-10-${String(dayOfMonth).padStart(2, "0")}`,
    average: price,
    lowest: price - 1,
    highest: price + 1,
    order_count: 10,
    volume,
  };
}

/** `count` consecutive days from Oct 1, priced 1, 2, 3, … */
function rising(count: number): MarketHistoryDay[] {
  return Array.from({ length: count }, (_, index) => day(index + 1, index + 1));
}

describe("buildPriceHistory", () => {
  it("sorts the days and maps ESI's fields onto the chart's", () => {
    const points = buildPriceHistory([day(3, 30), day(1, 10), day(2, 20)]);

    expect(points.map((point) => point.date)).toEqual([
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
    ]);
    expect(points[0]).toMatchObject({
      time: Date.UTC(2026, 9, 1),
      median: 10,
      low: 9,
      high: 11,
      range: [9, 11],
      volume: 100,
      orders: 10,
    });
  });

  it("leaves the averages out until a full window of history is behind them", () => {
    const points = buildPriceHistory(rising(25));

    expect(points[3]?.ma5).toBeUndefined();
    expect(points[4]?.ma5).toBe(3); // mean of 1..5
    expect(points[18]?.ma20).toBeUndefined();
    expect(points[19]?.ma20).toBe(10.5); // mean of 1..20
    expect(points[24]?.ma20).toBe(15.5); // mean of 6..25
  });

  it("measures windows in calendar days, so untraded days don't stretch them", () => {
    // Oct 1–4, then nothing until Oct 9: Oct 9's five-day window is Oct 5–9,
    // which holds only Oct 9 itself.
    const points = buildPriceHistory([
      day(1, 1),
      day(2, 2),
      day(3, 3),
      day(4, 4),
      day(9, 50),
    ]);

    expect(points.at(-1)?.ma5).toBe(50);
  });

  it("spans the Donchian channel from the lowest low to the highest high", () => {
    const points = buildPriceHistory([
      day(1, 10),
      day(2, 14),
      day(3, 8),
      day(4, 12),
      day(5, 11),
      day(6, 11),
    ]);

    expect(points[3]?.donchian).toBeUndefined();
    expect(points[4]?.donchian).toEqual([7, 15]);
    // Oct 1 has left the window; Oct 3's low and Oct 2's high remain.
    expect(points[5]?.donchian).toEqual([7, 15]);
  });

  it("drops rows whose date does not parse", () => {
    expect(buildPriceHistory([{ ...day(1, 1), date: "garbage" }])).toEqual([]);
  });
});

describe("sliceToRange", () => {
  it("keeps the range ending at the last day traded", () => {
    const points = buildPriceHistory(rising(31));

    const lastMonth = sliceToRange(points, "1m");
    expect(lastMonth).toHaveLength(30);
    expect(lastMonth[0]?.date).toBe("2026-10-02");
    expect(sliceToRange(points, "all")).toHaveLength(31);
  });

  it("is empty without history", () => {
    expect(sliceToRange([], "6m")).toEqual([]);
  });
});

describe("summarizeRange", () => {
  it("reports the latest median, the change and the volume per calendar day", () => {
    // Four days apart: the idle days in between count towards the average.
    const summary = summarizeRange(
      buildPriceHistory([day(1, 10, 300), day(4, 12, 500)]),
    );

    expect(summary?.latest.median).toBe(12);
    expect(summary?.change).toBeCloseTo(0.2);
    expect(summary?.averageDailyVolume).toBe(200);
  });

  it("has no change from a single day, and nothing without history", () => {
    expect(summarizeRange(buildPriceHistory([day(1, 10)]))?.change).toBe(
      undefined,
    );
    expect(summarizeRange([])).toBeUndefined();
  });
});

describe("niceTicks", () => {
  it("steps by round numbers and covers the data", () => {
    expect(niceTicks(3.66, 4.12)).toEqual([3.6, 3.8, 4, 4.2]);
    expect(niceTicks(0, 19e9, 3)).toEqual([0, 1e10, 2e10]);
    expect(niceTicks(1_234_567, 1_987_654)).toEqual([
      1_200_000, 1_400_000, 1_600_000, 1_800_000, 2_000_000,
    ]);
  });

  it("gives a flat series some height", () => {
    const ticks = niceTicks(5, 5);
    expect(ticks[0]).toBeLessThan(5);
    expect(ticks.at(-1)).toBeGreaterThan(5);
  });

  it("is empty for a missing extent", () => {
    expect(niceTicks(Number.NaN, 1)).toEqual([]);
  });
});

describe("tickFormatter", () => {
  it("gives every label the step's decimal places", () => {
    const format = tickFormatter([3.5, 3.75, 4]);
    expect([3.5, 3.75, 4].map(format)).toEqual(["3.50", "3.75", "4.00"]);
  });

  it("goes compact for large values", () => {
    expect(tickFormatter([0, 1e10, 2e10])(1e10)).toBe("10B");
  });
});

describe("visiblePriceExtent", () => {
  const points = buildPriceHistory(rising(6));

  it("spans only the series on show", () => {
    expect(visiblePriceExtent(points, new Set(["median"]))).toEqual([1, 6]);
    expect(visiblePriceExtent(points, new Set(["range"]))).toEqual([0, 7]);
    expect(visiblePriceExtent(points, new Set(["donchian"]))).toEqual([0, 7]);
    expect(visiblePriceExtent(points, new Set(["ma5"]))).toEqual([3, 4]);
  });

  it("has nothing to span with every series hidden", () => {
    expect(visiblePriceExtent(points, new Set())).toBeUndefined();
  });
});

describe("niceTicks at the limits of float precision", () => {
  it("terminates even when the step is below the spacing of the values", () => {
    // ULP(1e15) is 0.125, so a 0.01-wide extent gives a step that adding
    // cannot advance. It must still return, with a bounded number of ticks.
    const ticks = niceTicks(1e15, 1e15 + 0.01);
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks.length).toBeLessThanOrEqual(50);
  });
});
