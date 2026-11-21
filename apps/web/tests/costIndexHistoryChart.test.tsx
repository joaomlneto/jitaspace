import "@testing-library/jest-dom/jest-globals";

import type { ReactElement, ReactNode } from "react";
import { cloneElement } from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type * as ChartModule from "~/app/system/[systemId]/CostIndexHistory";
import type {
  CostIndexChartRow,
  CostIndexHistory,
} from "~/app/system/[systemId]/costIndices";

// jsdom has no layout, so give the chart the size a browser would.
jest.mock("recharts", () => {
  const actual = jest.requireActual<Record<string, unknown>>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) =>
      cloneElement(
        children as ReactElement<{ width?: number; height?: number }>,
        { width: 800, height: 280 },
      ),
  };
});

const mockFetch = jest.fn<typeof fetch>();
/** jsdom has no `Response`; the chart reads only `ok`, `status` and `json()`. */
const reply = (body: unknown, status = 200) =>
  ({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  }) as Response;
beforeEach(() => {
  global.fetch = mockFetch;
});
afterEach(() => {
  mockFetch.mockReset();
});

// Loaded lazily: @swc/jest does not hoist jest.mock above static imports.
const load = () =>
  require("~/app/system/[systemId]/CostIndexHistory") as typeof ChartModule;

const HOUR = 60 * 60 * 1000;
const LATEST = Date.parse("2026-11-04T01:24:54Z");
const values = (manufacturing: number) => [
  manufacturing,
  0.0014,
  0.0014,
  0.0014,
  0.0014,
  0.0014,
];

const history = (overrides: Partial<CostIndexHistory> = {}) =>
  ({
    range: "30d",
    resolution: "change",
    firstSnapshotAt: Date.parse("2017-11-29T07:53:41Z"),
    latestSnapshotAt: LATEST,
    from: LATEST - 30 * 24 * HOUR,
    points: [
      { time: LATEST - 30 * 24 * HOUR, values: values(0.16) },
      { time: LATEST - 10 * 24 * HOUR, values: values(0.17) },
    ],
    gaps: [{ from: LATEST - 20 * 24 * HOUR, to: LATEST - 19 * 24 * HOUR }],
    ...overrides,
  }) satisfies CostIndexHistory;

const renderChart = () => {
  const { CostIndexHistory } = load();
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MantineProvider env="test">
        <CostIndexHistory systemId={30000142} />
      </MantineProvider>
    </QueryClientProvider>,
  );
};

describe("CostIndexHistory", () => {
  it("charts every activity over 30 days, then the range picked", async () => {
    mockFetch.mockResolvedValue(reply(history()));
    const { container } = renderChart();

    await waitFor(() =>
      expect(container.querySelectorAll(".recharts-line")).toHaveLength(6),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/system/30000142/cost-indices?range=30d",
    );
    expect(screen.getByText(/Recorded since/)).toBeInTheDocument();
    expect(
      screen.getByText(/gaps in the record \(1 in this range\)/),
    ).toBeInTheDocument();
    // Ticks across the whole range, as days and percentages.
    expect(
      container.querySelectorAll(
        ".recharts-xAxis .recharts-cartesian-axis-tick",
      ),
    ).toHaveLength(6);
    expect(screen.getAllByText("20%").length).toBeGreaterThan(0);

    mockFetch.mockResolvedValue(
      reply(
        history({
          range: "all",
          resolution: "day",
          from: null,
          gaps: [],
          points: [
            { time: Date.parse("2017-11-29T07:53:41Z"), values: values(0.11) },
          ],
        }),
      ),
    );
    fireEvent.click(screen.getByLabelText("All"));
    await waitFor(() =>
      expect(mockFetch).toHaveBeenLastCalledWith(
        "/api/system/30000142/cost-indices?range=all",
      ),
    );
    await waitFor(() =>
      expect(screen.getByText(/One point per day/)).toBeInTheDocument(),
    );
  });

  it("hides an activity its chip turns off, and shows it again", async () => {
    mockFetch.mockResolvedValue(reply(history()));
    const { container } = renderChart();
    await waitFor(() =>
      expect(container.querySelectorAll(".recharts-line")).toHaveLength(6),
    );

    const chip = screen.getByRole("button", { name: "Manufacturing" });
    fireEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "false");
    expect(container.querySelectorAll(".recharts-line")).toHaveLength(5);
    fireEvent.click(chip);
    expect(container.querySelectorAll(".recharts-line")).toHaveLength(6);
  });

  it("says so when the system has no record in the range", async () => {
    mockFetch.mockResolvedValue(reply(history({ points: [], gaps: [] })));
    renderChart();
    await waitFor(() =>
      expect(
        screen.getByText(
          "No cost indices recorded for this system in this range.",
        ),
      ).toBeInTheDocument(),
    );
  });

  it("says so when the history cannot be loaded", async () => {
    mockFetch.mockResolvedValue(reply({ error: "down" }, 500));
    renderChart();
    await waitFor(() =>
      expect(
        screen.getByText("Could not load the cost index history."),
      ).toBeInTheDocument(),
    );
  });
});

describe("HistoryTooltip", () => {
  const row = (manufacturing: number | null): CostIndexChartRow => ({
    time: Date.parse("2026-10-10T19:46:06Z"),
    manufacturing,
    researchingTimeEfficiency: manufacturing === null ? null : 0.0239,
    researchingMaterialEfficiency: null,
    copying: null,
    invention: null,
    reaction: null,
  });
  const renderTooltip = (
    point: CostIndexChartRow | undefined,
    { active = true, daily = false } = {},
  ) => {
    const { HistoryTooltip } = load();
    return render(
      <MantineProvider env="test">
        <HistoryTooltip
          active={active}
          payload={point ? [{ payload: point }] : []}
          visible={new Set(["manufacturing", "researchingTimeEfficiency"])}
          daily={daily}
        />
      </MantineProvider>,
    );
  };

  it("lists the activities shown, as percentages", () => {
    renderTooltip(row(0.1648));
    expect(screen.getByText("16.48%")).toBeInTheDocument();
    expect(screen.getByText("2.39%")).toBeInTheDocument();
    expect(screen.queryByText("Copying")).not.toBeInTheDocument();
    expect(screen.getByText(/UTC/)).toBeInTheDocument();
  });

  it("marks an activity with no value, and dates a daily point by day", () => {
    renderTooltip(
      { ...row(0.1648), researchingTimeEfficiency: null },
      {
        daily: true,
      },
    );
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText(/UTC/)).not.toBeInTheDocument();
  });

  it("says nothing was recorded at a break in the lines", () => {
    renderTooltip(row(null));
    expect(
      screen.getByText("Nothing recorded from here to the next point."),
    ).toBeInTheDocument();
  });

  it("renders nothing when not hovering", () => {
    const { container } = renderTooltip(row(0.1), { active: false });
    // Mantine's provider leaves only its <style>.
    expect(container.querySelector(".mantine-Paper-root")).toBeNull();
    const empty = renderTooltip(undefined);
    expect(empty.container.querySelector(".mantine-Paper-root")).toBeNull();
  });
});
