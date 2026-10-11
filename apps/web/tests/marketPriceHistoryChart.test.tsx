import "@testing-library/jest-dom/jest-globals";

import type { ReactElement, ReactNode } from "react";
import { cloneElement } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import type { MarketHistoryDay } from "~/components/Market/priceHistory";

interface HistoryResult {
  data?: { data: MarketHistoryDay[] };
  isLoading: boolean;
  isError: boolean;
  isPlaceholderData?: boolean;
}

const PLEX = 44992;
const GLOBAL_PLEX_MARKET = 19000001;

const mockUseHistory =
  jest.fn<
    (
      regionId: number | undefined,
      params: { type_id: number },
      headers?: unknown,
      options?: unknown,
    ) => HistoryResult
  >();
const mockNameLookup =
  jest.fn<
    (
      entries: { id: number; category?: string }[],
    ) => Record<string, { value?: { name: string } } | undefined>
  >();
const mockSetParams = jest.fn();
let mockParams: { region: number | null; range: string } = {
  region: 10000002,
  range: "6m",
};
/** What ESI says the global PLEX market carries. */
let mockGlobalMarketTypes: { data?: { data: number[] }; isError: boolean } = {
  data: { data: [PLEX] },
  isError: false,
};

jest.mock("@jitaspace/esi-client", () => ({
  useGetMarketsRegionIdHistory: (
    regionId: number | undefined,
    params: { type_id: number },
    headers?: unknown,
    options?: unknown,
  ) => mockUseHistory(regionId, params, headers, options),
  useGetMarketsRegionIdTypes: (regionId: number) => {
    if (regionId !== GLOBAL_PLEX_MARKET) throw new Error("unexpected region");
    return mockGlobalMarketTypes;
  },
  useGetUniverseRegions: () => ({
    data: { data: [10000002, 10000001, 11000001, GLOBAL_PLEX_MARKET] },
  }),
}));
// Over the shared stub, which carries the real hub list.
jest.mock("@jitaspace/hooks", () => ({
  ...jest.requireActual<Record<string, unknown>>("@jitaspace/hooks"),
  useEsiNameLookup: (entries: { id: number; category?: string }[]) =>
    mockNameLookup(entries),
}));
jest.mock("nuqs", () => ({
  parseAsInteger: { withDefault: () => ({}) },
  parseAsStringLiteral: () => ({ withDefault: () => ({}) }),
  useQueryStates: () => [mockParams, mockSetParams],
}));
jest.mock("~/components/DataTable", () => ({
  DataTable: ({ data }: { data: { date: string }[] }) => (
    <table>
      <tbody>
        {data.map((row) => (
          <tr key={row.date}>
            <td>{row.date}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));
// jsdom has no layout, so give the charts the size a browser would.
jest.mock("recharts", () => {
  const actual = jest.requireActual<Record<string, unknown>>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) =>
      cloneElement(
        children as ReactElement<{ width?: number; height?: number }>,
        {
          width: 800,
          height: 300,
        },
      ),
  };
});

function history(days: number): MarketHistoryDay[] {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.UTC(2026, 8, 1 + index));
    return {
      date: date.toISOString().slice(0, 10),
      average: 4 + index / 100,
      lowest: 3.9,
      highest: 4.5,
      order_count: 1000,
      volume: 1_000_000,
    };
  });
}

function renderChart(typeId = 34) {
  const {
    MarketPriceHistory,
  } = require("~/components/Market/MarketPriceHistory");
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <MarketPriceHistory typeId={typeId} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe("MarketPriceHistory", () => {
  beforeEach(() => {
    mockParams = { region: 10000002, range: "6m" };
    mockGlobalMarketTypes = { data: { data: [PLEX] }, isError: false };
    mockSetParams.mockClear();
    mockUseHistory.mockReset().mockReturnValue({
      data: { data: history(30) },
      isLoading: false,
      isError: false,
    });
    mockNameLookup
      .mockReset()
      .mockReturnValue({ "10000001": { value: { name: "Derelik" } } });
  });

  it("asks ESI for the type's history in the region from the URL", () => {
    mockParams = { region: 10000043, range: "6m" };
    renderChart();
    expect(mockUseHistory).toHaveBeenCalledWith(
      10000043,
      { type_id: 34 },
      undefined,
      expect.anything(),
    );
  });

  it("asks ESI for a known non-hub region", () => {
    mockParams = { region: 10000001, range: "6m" };
    renderChart();
    expect(mockSetParams).not.toHaveBeenCalled();
    expect(mockUseHistory).toHaveBeenCalledWith(
      10000001,
      { type_id: 34 },
      undefined,
      expect.anything(),
    );
  });

  it.each([31000005, 1, -5])(
    "falls back to the default hub for region %p, which has no market",
    (region) => {
      mockParams = { region, range: "6m" };
      renderChart();

      expect(mockUseHistory).not.toHaveBeenCalledWith(
        region,
        expect.anything(),
        undefined,
        expect.anything(),
      );
      expect(mockUseHistory).toHaveBeenCalledWith(
        10000002,
        { type_id: 34 },
        undefined,
        expect.anything(),
      );
      expect(screen.getByRole("combobox", { name: "Region" })).toHaveValue(
        "The Forge (Jita)",
      );
      // …and the refused id leaves the URL rather than being shared on.
      expect(mockSetParams).toHaveBeenCalledWith({ region: null });
    },
  );

  it("opens a type on The Forge when it does not trade on the global market", () => {
    mockParams = { region: null, range: "6m" };
    renderChart();
    expect(mockUseHistory).toHaveBeenCalledWith(
      10000002,
      { type_id: 34 },
      undefined,
      expect.anything(),
    );
    expect(mockSetParams).not.toHaveBeenCalled();
  });

  it("opens PLEX on the global PLEX market, the only place it trades", () => {
    mockParams = { region: null, range: "6m" };
    renderChart(PLEX);
    expect(mockUseHistory).toHaveBeenCalledWith(
      GLOBAL_PLEX_MARKET,
      { type_id: PLEX },
      undefined,
      expect.anything(),
    );
    expect(mockUseHistory).not.toHaveBeenCalledWith(
      10000002,
      expect.anything(),
      undefined,
      expect.anything(),
    );
    expect(screen.getByRole("combobox", { name: "Region" })).toHaveValue(
      "Global PLEX market",
    );
    expect(mockSetParams).not.toHaveBeenCalled();
  });

  it("waits for the global market's types before picking a default", () => {
    mockParams = { region: null, range: "6m" };
    mockGlobalMarketTypes = { isError: false };
    const { container } = renderChart(PLEX);
    expect(mockUseHistory).toHaveBeenCalledWith(
      undefined,
      { type_id: PLEX },
      undefined,
      expect.anything(),
    );
    expect(container.querySelectorAll(".recharts-wrapper")).toHaveLength(0);
  });

  it("falls back to The Forge if the global market's types can't be listed", () => {
    mockParams = { region: null, range: "6m" };
    mockGlobalMarketTypes = { isError: true };
    renderChart(PLEX);
    expect(mockUseHistory).toHaveBeenCalledWith(
      10000002,
      { type_id: PLEX },
      undefined,
      expect.anything(),
    );
  });

  it("still charts another region for PLEX when the URL asks for it", () => {
    renderChart(PLEX);
    expect(mockUseHistory).toHaveBeenCalledWith(
      10000002,
      { type_id: PLEX },
      undefined,
      expect.anything(),
    );
    expect(mockSetParams).not.toHaveBeenCalled();
  });

  it("offers the global PLEX market among the trade hubs", () => {
    renderChart();
    fireEvent.click(screen.getByRole("combobox", { name: "Region" }));
    fireEvent.click(screen.getByRole("option", { name: "Global PLEX market" }));
    expect(mockSetParams).toHaveBeenCalledWith({ region: GLOBAL_PLEX_MARKET });
  });

  it("drops the region from the URL when the reader picks the default", () => {
    mockParams = { region: 10000043, range: "6m" };
    renderChart(PLEX);
    fireEvent.click(screen.getByRole("combobox", { name: "Region" }));
    fireEvent.click(screen.getByRole("option", { name: "Global PLEX market" }));
    expect(mockSetParams).toHaveBeenCalledWith({ region: null });
  });

  it("summarises the range and draws both charts", () => {
    const { container } = renderChart();

    expect(screen.getByText("Median")).toBeInTheDocument();
    expect(screen.getByText("4.29 ISK")).toBeInTheDocument();
    expect(screen.getByText("▲ +7.3%")).toBeInTheDocument();
    // 1,000,000 units a day, every day.
    expect(screen.getByText("1M", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "6M" })).toBeChecked();
    expect(container.querySelectorAll(".recharts-wrapper")).toHaveLength(2);
  });

  it("reads out every shown series for the hovered day", async () => {
    const { container } = renderChart();
    const [priceChart] = container.querySelectorAll(".recharts-wrapper");
    if (!priceChart) throw new Error("price chart not rendered");

    // jsdom has no layout: the chart sits at the origin, 800px wide. Near the
    // right edge is late in the month, where the 20-day average has a value.
    fireEvent.mouseMove(priceChart, { clientX: 760, clientY: 150 });

    const readout = await waitFor(() => {
      const tooltip = container.querySelector(".recharts-tooltip-wrapper");
      expect(tooltip).toHaveTextContent("Median");
      return tooltip;
    });
    expect(readout).toHaveTextContent("Max");
    expect(readout).toHaveTextContent("5d avg");
    expect(readout).toHaveTextContent("20d avg");
    expect(readout).toHaveTextContent("Donchian");
    expect(readout).toHaveTextContent("Volume");
  });

  it("starts with every series on, and toggles each", () => {
    renderChart();

    const toggles = within(
      screen.getByRole("group", { name: "Series shown" }),
    ).getAllByRole("button");
    expect(toggles.map((toggle) => toggle.textContent)).toEqual([
      "Median day price",
      "Min/max",
      "5-day average",
      "20-day average",
      "Donchian channel (5d)",
    ]);
    for (const toggle of toggles) {
      expect(toggle).toHaveAttribute("aria-pressed", "true");
    }

    const donchian = screen.getByRole("button", { name: /Donchian channel/ });
    fireEvent.click(donchian);
    expect(donchian).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(donchian);
    expect(donchian).toHaveAttribute("aria-pressed", "true");
  });

  it("lists the days, newest first, behind a toggle", () => {
    renderChart();
    expect(screen.queryByText("2026-09-30")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show daily data" }));

    const rows = screen.getAllByRole("row");
    expect(rows[0]).toHaveTextContent("2026-09-30");
    expect(rows.at(-1)).toHaveTextContent("2026-09-01");
  });

  it("writes a new time range to the URL", () => {
    renderChart();
    fireEvent.click(screen.getByRole("radio", { name: "1Y" }));
    expect(mockSetParams).toHaveBeenCalledWith({ range: "1y" });
  });

  it("names every market region, leaving out wormhole space", () => {
    renderChart();

    expect(mockNameLookup).toHaveBeenLastCalledWith([
      { id: 10000001, category: "region" },
    ]);
    fireEvent.click(screen.getByRole("combobox", { name: "Region" }));
    expect(screen.getByRole("option", { name: "Derelik" })).toBeInTheDocument();
  });

  it("says so when the region has no trades", () => {
    mockUseHistory.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      isError: false,
    });
    renderChart();
    expect(
      screen.getByText("No trades in The Forge (Jita) over the past year."),
    ).toBeInTheDocument();
  });

  it("reports a failed request", () => {
    mockUseHistory.mockReturnValue({ isLoading: false, isError: true });
    renderChart();
    expect(
      screen.getByText(/Could not load the price history/),
    ).toBeInTheDocument();
  });

  it("keeps the previous region's chart up, dimmed, while the next loads", () => {
    mockUseHistory.mockReturnValue({
      data: { data: history(30) },
      isLoading: false,
      isError: false,
      isPlaceholderData: true,
    });
    const { container } = renderChart();

    expect(container.querySelectorAll(".recharts-wrapper")).toHaveLength(2);
    expect(container.querySelector('[aria-busy="true"]')).toHaveStyle({
      opacity: "0.55",
    });
    expect(mockUseHistory).toHaveBeenCalledWith(
      10000002,
      { type_id: 34 },
      undefined,
      { query: { placeholderData: expect.any(Function) } },
    );
  });

  it("holds the space while loading", () => {
    mockUseHistory.mockReturnValue({ isLoading: true, isError: false });
    const { container } = renderChart();
    expect(container.querySelectorAll(".recharts-wrapper")).toHaveLength(0);
    expect(screen.queryByText("Median")).not.toBeInTheDocument();
  });
});
