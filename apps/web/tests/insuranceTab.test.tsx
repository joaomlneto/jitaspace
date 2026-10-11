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
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";

import type * as InsuranceTabModule from "~/app/type/[typeId]/InsuranceTab";
import type {
  InsurancePricePeriod,
  TypeInsuranceHistory,
} from "~/lib/insurance";
import { INSURANCE_LEVELS } from "~/lib/insurance";

// jsdom has no layout, so give the chart the size a browser would.
jest.mock("recharts", () => {
  const actual = jest.requireActual<Record<string, unknown>>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) =>
      cloneElement(
        children as ReactElement<{ width?: number; height?: number }>,
        { width: 800, height: 260 },
      ),
  };
});

const period = (
  validFrom: string,
  validUntil: string | null,
  basic: number,
): InsurancePricePeriod => ({
  validFrom,
  validUntil,
  levels: Object.fromEntries(
    INSURANCE_LEVELS.map(({ key }, index) => [
      key,
      {
        cost: (basic * (index + 1)) / 10,
        payout: basic * (1 + index * 0.2),
      },
    ]),
  ) as InsurancePricePeriod["levels"],
});

const current = period("2026-10-10T11:50:00.000Z", null, 86552);
const history: TypeInsuranceHistory = {
  periods: [
    period("2026-10-09T11:50:00.000Z", "2026-10-10T11:50:00.000Z", 86659.5),
    current,
  ],
  lastObservedAt: "2026-10-10T19:31:33.000Z",
};

const mockFetch = jest.fn<typeof fetch>();
/** jsdom has no `Response`; the tab reads only `ok`, `status` and `json()`. */
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
  require("~/app/type/[typeId]/InsuranceTab") as typeof InsuranceTabModule;

const renderTab = (latest: InsurancePricePeriod, searchParams = "") => {
  const { InsuranceTab } = load();
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MantineProvider env="test">
        <InsuranceTab typeId={587} latest={latest} />
      </MantineProvider>
    </QueryClientProvider>,
    { wrapper: withNuqsTestingAdapter({ searchParams, hasMemory: true }) },
  );
};

describe("InsuranceTab", () => {
  it("shows every level's current prices, then the history", async () => {
    mockFetch.mockResolvedValue(reply(history));
    const { container } = renderTab(current);

    expect(screen.getByText("Current insurance")).toBeInTheDocument();
    expect(screen.getByText("Platinum")).toBeInTheDocument();
    // Basic: cost, payout, and payout − cost.
    expect(screen.getByText("8,655.20")).toBeInTheDocument();
    expect(screen.getAllByText("86,552.00").length).toBeGreaterThan(0);
    expect(screen.getByText("77,896.80")).toBeInTheDocument();

    // The chart first, of Platinum.
    await waitFor(() =>
      expect(container.querySelector(".recharts-wrapper")).not.toBeNull(),
    );
    expect(mockFetch).toHaveBeenCalledWith("/api/type/587/insurance");
    expect(
      screen.getByText(/last checked 10 Oct 2026, 19:31 UTC/),
    ).toBeInTheDocument();
    expect(screen.getByText("Platinum payout")).toBeInTheDocument();
    expect(screen.queryByText("Now")).not.toBeInTheDocument();

    // Then the table instead: its cells render each column's formatter.
    fireEvent.click(screen.getByLabelText("Table"));
    await waitFor(() => expect(screen.getByText("Now")).toBeInTheDocument());
    expect(screen.getByText("Platinum payout (ISK)")).toBeInTheDocument();
    expect(screen.getByText("9 Oct 2026, 11:50 UTC")).toBeInTheDocument();
    expect(container.querySelector(".recharts-wrapper")).toBeNull();
  });

  it("charts the tier picked, and remembers it in the URL", async () => {
    mockFetch.mockResolvedValue(reply(history));
    renderTab(current, "?insuranceTier=gold");
    await waitFor(() =>
      expect(screen.getByText("Gold payout")).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByLabelText("Insurance tier"), {
      target: { value: "basic" },
    });
    await waitFor(() =>
      expect(screen.getByText("Basic payout")).toBeInTheDocument(),
    );
  });

  it("opens on the table from a link", async () => {
    mockFetch.mockResolvedValue(reply(history));
    renderTab(current, "?insuranceView=table");
    await waitFor(() => expect(screen.getByText("Now")).toBeInTheDocument());
    expect(screen.queryByLabelText("Insurance tier")).not.toBeInTheDocument();
  });

  it("says when the item is no longer insurable", () => {
    mockFetch.mockResolvedValue(reply({ periods: [], lastObservedAt: null }));
    renderTab(
      period("2025-01-01T00:00:00.000Z", "2025-06-01T00:00:00.000Z", 100),
    );
    expect(screen.getByText("Last insurance prices")).toBeInTheDocument();
    expect(
      screen.getByText(
        /has not listed insurance for this item since 1 Jun 2025/,
      ),
    ).toBeInTheDocument();
  });

  it("reports a history that failed to load", async () => {
    mockFetch.mockResolvedValue(reply(null, 500));
    renderTab(current);
    await waitFor(() =>
      expect(
        screen.getByText("Could not load the price history."),
      ).toBeInTheDocument(),
    );
  });
});

describe("ChartTooltip", () => {
  const renderTooltip = (
    props: Parameters<typeof InsuranceTabModule.ChartTooltip>[0],
  ) => {
    const { ChartTooltip } = load();
    return render(
      <MantineProvider env="test">
        <ChartTooltip {...props} />
      </MantineProvider>,
    );
  };

  it("lists every level's payout and cost for the hovered period", () => {
    const hovered = history.periods[0];
    renderTooltip({
      active: true,
      payload: [{ payload: { time: 0, payout: 1, period: hovered ?? null } }],
    });
    expect(screen.getByText(/From 9 Oct 2026, 11:50 UTC/)).toBeInTheDocument();
    expect(
      screen.getByText(/until 10 Oct 2026, 11:50 UTC/),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/^for /)).toHaveLength(6);
  });

  it("says the current period runs to now", () => {
    renderTooltip({
      active: true,
      payload: [{ payload: { time: 0, payout: 1, period: current } }],
    });
    expect(screen.getByText(/to now/)).toBeInTheDocument();
  });

  it("shows nothing off the line or between periods", () => {
    renderTooltip({
      active: true,
      payload: [{ payload: { time: 0, payout: null, period: null } }],
    });
    expect(screen.queryByText(/^From /)).not.toBeInTheDocument();
  });
});
