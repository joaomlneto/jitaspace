import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { cleanup, render, screen } from "@testing-library/react";

import type { HistoryBuild } from "~/app/history/_timeline-chart.logic";
import {
  addWeeks,
  buildTimelineChartModel,
  formatWeekTick,
  weekStart,
} from "~/app/history/_timeline-chart.logic";

// Stub the recharts-backed BarChart so the component renders deterministically
// in jsdom; expose the series/data it receives via data-attributes for asserts.
jest.mock("@mantine/charts", () => ({
  BarChart: (props: { series: { name: string }[]; data: unknown[] }) => (
    <div
      data-testid="barchart"
      data-series={props.series.map((s) => s.name).join(",")}
      data-rows={String(props.data.length)}
    />
  ),
}));

describe("weekStart", () => {
  it("snaps any date to the Monday of its ISO week", () => {
    expect(weekStart("2025-01-01")).toBe("2024-12-30"); // Wed → prev Mon
    expect(weekStart("2024-12-30")).toBe("2024-12-30"); // Mon → itself
    expect(weekStart("2025-01-05")).toBe("2024-12-30"); // Sun → prev Mon
    expect(weekStart("2025-01-06")).toBe("2025-01-06"); // next Mon
  });
});

describe("addWeeks", () => {
  it("shifts by whole weeks in UTC", () => {
    expect(addWeeks("2024-12-30", 1)).toBe("2025-01-06");
    expect(addWeeks("2025-01-06", -1)).toBe("2024-12-30");
    expect(addWeeks("2024-12-30", 0)).toBe("2024-12-30");
  });
});

describe("formatWeekTick", () => {
  it("renders a compact month + 2-digit year", () => {
    expect(formatWeekTick("2025-01-06")).toBe("Jan '25");
    expect(formatWeekTick("2026-12-28")).toBe("Dec '26");
  });

  it("tolerates malformed input", () => {
    expect(formatWeekTick("2025")).toBe("Jan '25"); // missing month → default
    expect(formatWeekTick("2025-13-01")).toBe(" '25"); // out-of-range month
  });
});

describe("buildTimelineChartModel", () => {
  const builds: HistoryBuild[] = [
    {
      build: 1,
      date: "2025-01-01",
      changeCount: 5,
      byCollection: { types: 3, typeDogma: 2 },
    },
    {
      build: 2,
      date: "2025-01-08",
      changeCount: 4,
      byCollection: { types: 4 },
    },
    // undated build → cannot be placed on a time axis → skipped
    { build: 3, date: null, changeCount: 9, byCollection: { types: 9 } },
    // legacy build with no byCollection → counted as "types"
    { build: 4, date: "2025-01-09", changeCount: 1 },
  ];

  it("buckets builds by week, summing per collection across active filters", () => {
    const m = buildTimelineChartModel(builds, ["types", "typeDogma"]);
    expect(m.continuous).toBe(true);
    // week 2024-12-30 (build 1) and 2025-01-06 (builds 2 & 4)
    expect(m.data.map((r) => r.week)).toEqual(["2024-12-30", "2025-01-06"]);
    expect(m.data[0]).toMatchObject({ types: 3, typeDogma: 2 });
    expect(m.data[1]).toMatchObject({ types: 5 }); // 4 (build 2) + 1 (build 4)
    expect(m.totalChanges).toBe(10); // undated build 3 excluded
    // series largest-first: types (8) before typeDogma (2)
    expect(m.series.map((s) => s.name)).toEqual(["types", "typeDogma"]);
    expect(m.series[0]).toMatchObject({ label: "Type", color: "blue.6" });
  });

  it("orders equal-total series by name for a stable stack", () => {
    const tied: HistoryBuild[] = [
      {
        build: 1,
        date: "2025-01-06",
        changeCount: 2,
        byCollection: { typeDogma: 1, types: 1 },
      },
    ];
    const m = buildTimelineChartModel(tied, ["types", "typeDogma"]);
    // equal totals → alphabetical tiebreak ("typeDogma" before "types")
    expect(m.series.map((s) => s.name)).toEqual(["typeDogma", "types"]);
  });

  it("drops a collection that is filtered out", () => {
    const m = buildTimelineChartModel(builds, ["typeDogma"]);
    expect(m.series.map((s) => s.name)).toEqual(["typeDogma"]);
    expect(m.totalChanges).toBe(2);
  });

  it("returns an empty model when nothing matches", () => {
    expect(buildTimelineChartModel(builds, [])).toMatchObject({
      data: [],
      series: [],
      totalChanges: 0,
    });
    expect(buildTimelineChartModel([], ["types"]).data).toHaveLength(0);
    // only undated builds → still empty
    expect(
      buildTimelineChartModel(
        [{ build: 9, date: null, changeCount: 3, byCollection: { types: 3 } }],
        ["types"],
      ).data,
    ).toHaveLength(0);
  });

  it("fills quiet weeks continuously between first and last", () => {
    const sparse: HistoryBuild[] = [
      {
        build: 1,
        date: "2025-01-06",
        changeCount: 1,
        byCollection: { types: 1 },
      },
      {
        build: 2,
        date: "2025-01-27",
        changeCount: 1,
        byCollection: { types: 1 },
      },
    ];
    const m = buildTimelineChartModel(sparse, ["types"]);
    expect(m.data.map((r) => r.week)).toEqual([
      "2025-01-06",
      "2025-01-13",
      "2025-01-20",
      "2025-01-27",
    ]);
    expect(m.data[1]).toMatchObject({ types: 0 }); // gap week is zero
  });

  it("falls back to populated-only weeks past the continuous cap", () => {
    const wide: HistoryBuild[] = [
      {
        build: 1,
        date: "2000-01-03",
        changeCount: 1,
        byCollection: { types: 1 },
      },
      {
        build: 2,
        date: "2025-01-06",
        changeCount: 1,
        byCollection: { types: 1 },
      },
    ];
    const m = buildTimelineChartModel(wide, ["types"]);
    expect(m.continuous).toBe(false);
    expect(m.data).toHaveLength(2);
  });
});

describe("<HistoryTimelineChart />", () => {
  const builds: HistoryBuild[] = [
    {
      build: 1,
      date: "2025-01-01",
      changeCount: 5,
      byCollection: { types: 3, typeDogma: 2 },
    },
  ];

  afterEach(cleanup);

  it("renders the stacked chart with a series per active collection", async () => {
    const { HistoryTimelineChart } =
      await import("~/app/history/_timeline-chart");
    render(
      <MantineProvider>
        <HistoryTimelineChart
          builds={builds}
          collections={["types", "typeDogma"]}
        />
      </MantineProvider>,
    );
    expect(screen.getByText("Activity over time")).toBeTruthy();
    expect(screen.getByTestId("barchart").getAttribute("data-series")).toBe(
      "types,typeDogma",
    );
  });

  it("shows an empty state when no categories are selected", async () => {
    const { HistoryTimelineChart } =
      await import("~/app/history/_timeline-chart");
    render(
      <MantineProvider>
        <HistoryTimelineChart builds={builds} collections={[]} />
      </MantineProvider>,
    );
    expect(screen.getByText(/No dated changes/)).toBeTruthy();
  });
});
