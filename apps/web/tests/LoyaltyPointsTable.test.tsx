import "@testing-library/jest-dom/jest-globals";

import React from "react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { FuzzworkTypeMarketAggregate } from "@jitaspace/hooks";
import { useFuzzworkRegionalMarketAggregates } from "@jitaspace/hooks";

import {
  DEFAULT_DATA_TABLE_ENGINE,
  usePreferencesStore,
} from "~/lib/preferences";
// @jitaspace/ui is redirected to __mocks__/@jitaspace/ui.tsx via moduleNameMapper
// (same reason as hooks — real source pulls in @tabler/icons-react ESM bundles).

// ---------------------------------------------------------------------------
// Component under test (imported after mocks are registered)
// @jitaspace/datatable is loaded via moduleNameMapper → real source → SWC
// ---------------------------------------------------------------------------
import { LoyaltyPointsTable } from "../components/LPStore/LoyaltyPointsTable";

// @jitaspace/hooks is redirected to __mocks__/@jitaspace/hooks.ts via
// moduleNameMapper — import the stub's jest.fn() directly so tests can
// configure return values without needing their own jest.mock() calls.

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const corporations = [
  { corporationId: 1, name: "Corp A" },
  { corporationId: 2, name: "Corp B" },
];
const singleCorp = [corporations[0]!];

const types = [
  { typeId: 100, name: "Item Alpha" },
  { typeId: 200, name: "Item Beta" },
];

const MARKET_STATS: FuzzworkTypeMarketAggregate = {
  buy: {
    percentile: 1_000_000,
    volume: 500,
    weightedAverage: 1_000_000,
    max: 1_100_000,
    stddev: 0,
    median: 1_000_000,
    orderCount: 10,
  },
  sell: {
    percentile: 1_200_000,
    volume: 300,
    weightedAverage: 1_200_000,
    max: 1_300_000,
    stddev: 0,
    median: 1_200_000,
    orderCount: 8,
  },
};

const offers = [
  {
    offerId: 1001,
    corporationId: 1,
    typeId: 100,
    quantity: 1,
    akCost: null,
    lpCost: 5000,
    iskCost: 100_000,
    requiredItems: [{ typeId: 200, quantity: 2 }],
  },
  {
    offerId: 1002,
    corporationId: 2,
    typeId: 200,
    quantity: 5,
    akCost: 100,
    lpCost: 2500,
    iskCost: 50_000,
    requiredItems: [],
  },
];

const wrap = (ui: React.ReactElement) =>
  render(React.createElement(MantineProvider, null, ui));

// LoyaltyPointsTable renders through the app DataTable, so it uses whichever
// engine the preferences select. Most tests assert against the default
// (TanStack); the engine-specific ones below set it explicitly.
afterEach(() => {
  usePreferencesStore.setState({ dataTableEngine: DEFAULT_DATA_TABLE_ENGINE });
});

// mantine-datatable hides every cell behind a media-query check; the shared
// matchMedia stub reports all queries unmatched, which blanks the table. Make an
// empty / no-constraint query match so its cells render under jsdom.
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: query.trim() === "",
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }),
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("LoyaltyPointsTable — basic rendering", () => {
  beforeEach(() => {
    (useFuzzworkRegionalMarketAggregates as jest.Mock).mockReturnValue({
      data: {},
    });
  });

  it("renders a table with data", () => {
    wrap(
      React.createElement(LoyaltyPointsTable, {
        corporations,
        types,
        offers,
      }),
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("renders a global search input", () => {
    wrap(
      React.createElement(LoyaltyPointsTable, {
        corporations,
        types,
        offers,
      }),
    );
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });

  it("renders pagination controls", () => {
    wrap(
      React.createElement(LoyaltyPointsTable, {
        corporations,
        types,
        offers,
      }),
    );
    expect(screen.getByText("Rows per page:")).toBeInTheDocument();
  });

  it("renders the LP Cost column header", () => {
    wrap(
      React.createElement(LoyaltyPointsTable, {
        corporations,
        types,
        offers,
      }),
    );
    expect(screen.getByText("LP Cost")).toBeInTheDocument();
  });

  it("renders the ISK Cost column header", () => {
    wrap(
      React.createElement(LoyaltyPointsTable, {
        corporations,
        types,
        offers,
      }),
    );
    expect(screen.getByText("ISK Cost")).toBeInTheDocument();
  });

  it("renders LP cost cell values", () => {
    wrap(
      React.createElement(LoyaltyPointsTable, {
        corporations,
        types,
        offers,
      }),
    );
    expect(screen.getByText("5,000 LP")).toBeInTheDocument();
    expect(screen.getByText("2,500 LP")).toBeInTheDocument();
  });

  it("renders AK cost when non-null", () => {
    wrap(
      React.createElement(LoyaltyPointsTable, {
        corporations,
        types,
        offers,
      }),
    );
    // "100" appears in the akCost cell (offer 1002 has akCost=100)
    expect(screen.getAllByText("100").length).toBeGreaterThan(0);
  });

  it("renders item and corporation names resolved on the server (no per-row name hooks)", () => {
    wrap(
      React.createElement(LoyaltyPointsTable, {
        corporations,
        types,
        offers,
      }),
    );
    // Names come straight from the resolved `types` / `corporations` props and
    // render through EveEntityNameDisplay — not the per-row TypeName /
    // CorporationName ESI-name hooks that used to fetch them client-side.
    expect(screen.getAllByText("Item Alpha").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Item Beta").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Corp A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Corp B").length).toBeGreaterThan(0);
    // The per-row name components are gone from the table entirely.
    expect(screen.queryAllByTestId("type-name")).toHaveLength(0);
    expect(screen.queryAllByTestId("corp-name")).toHaveLength(0);
  });

  it("renders required-item type avatars", () => {
    wrap(
      React.createElement(LoyaltyPointsTable, {
        corporations,
        types,
        offers,
      }),
    );
    expect(screen.getAllByTestId("type-avatar").length).toBeGreaterThan(0);
  });

  it("renders offer quantity > 1", () => {
    wrap(
      React.createElement(LoyaltyPointsTable, {
        corporations,
        types,
        offers,
      }),
    );
    // offer 1002 has quantity 5 which is > 1 and is shown in the Item cell
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders row count in pagination footer", () => {
    wrap(
      React.createElement(LoyaltyPointsTable, {
        corporations,
        types,
        offers,
      }),
    );
    expect(screen.getAllByText("2 rows").length).toBeGreaterThan(0);
  });
});

describe("LoyaltyPointsTable — market data cells", () => {
  beforeEach(() => {
    (useFuzzworkRegionalMarketAggregates as jest.Mock).mockReturnValue({
      data: { 100: MARKET_STATS, 200: MARKET_STATS },
    });
  });

  it("renders ISK amount cells when market data is present", () => {
    wrap(
      React.createElement(LoyaltyPointsTable, {
        corporations,
        types,
        offers,
      }),
    );
    expect(screen.getAllByTestId("isk-amount").length).toBeGreaterThan(0);
  });

  it("renders ISK/LP sell values", () => {
    wrap(
      React.createElement(LoyaltyPointsTable, {
        corporations,
        types,
        offers,
      }),
    );
    expect(screen.getAllByText(/ISK\/LP$/).length).toBeGreaterThan(0);
  });

  it("renders sell volume", () => {
    wrap(
      React.createElement(LoyaltyPointsTable, {
        corporations,
        types,
        offers,
      }),
    );
    // Sell volume = 300 for each offer that has market stats
    expect(screen.getAllByText("300").length).toBeGreaterThan(0);
  });

  it("renders buy volume", () => {
    wrap(
      React.createElement(LoyaltyPointsTable, {
        corporations,
        types,
        offers,
      }),
    );
    expect(screen.getAllByText("500").length).toBeGreaterThan(0);
  });
});

describe("LoyaltyPointsTable — undefined market data", () => {
  beforeEach(() => {
    (useFuzzworkRegionalMarketAggregates as jest.Mock).mockReturnValue({
      data: undefined,
    });
  });

  it("renders without crashing when market data is undefined", () => {
    wrap(
      React.createElement(LoyaltyPointsTable, {
        corporations,
        types,
        offers,
      }),
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("shows ISK cost cells even without market data", () => {
    wrap(
      React.createElement(LoyaltyPointsTable, {
        corporations,
        types,
        offers,
      }),
    );
    expect(screen.getAllByTestId("isk-amount").length).toBeGreaterThan(0);
  });
});

describe("LoyaltyPointsTable — empty offers", () => {
  beforeEach(() => {
    (useFuzzworkRegionalMarketAggregates as jest.Mock).mockReturnValue({
      data: {},
    });
  });

  it("shows empty state when offers array is empty", () => {
    wrap(
      React.createElement(LoyaltyPointsTable, {
        corporations,
        types,
        offers: [],
      }),
    );
    expect(screen.getByText("No data")).toBeInTheDocument();
  });
});

describe("LoyaltyPointsTable — single corporation", () => {
  beforeEach(() => {
    (useFuzzworkRegionalMarketAggregates as jest.Mock).mockReturnValue({
      data: {},
    });
  });

  it("renders with a single corporation", () => {
    wrap(
      React.createElement(LoyaltyPointsTable, {
        corporations: singleCorp,
        types,
        offers: [offers[0]!],
      }),
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
  });
});

describe("LoyaltyPointsTable — mantine-datatable engine", () => {
  beforeEach(() => {
    (useFuzzworkRegionalMarketAggregates as jest.Mock).mockReturnValue({
      data: {},
    });
    usePreferencesStore.setState({ dataTableEngine: "mantine-datatable" });
  });

  it("renders the same columns and rows", () => {
    wrap(
      React.createElement(LoyaltyPointsTable, {
        corporations,
        types,
        offers,
      }),
    );
    expect(document.querySelector(".mantine-datatable")).toBeInTheDocument();
    expect(screen.getByText("LP Cost")).toBeInTheDocument();
    expect(screen.getByText("5,000 LP")).toBeInTheDocument();
    expect(screen.getByText("2,500 LP")).toBeInTheDocument();
  });
});

describe("LoyaltyPointsTable — column filters", () => {
  beforeEach(() => {
    (useFuzzworkRegionalMarketAggregates as jest.Mock).mockReturnValue({
      data: {},
    });
  });

  const renderFilterable = () =>
    render(
      React.createElement(
        MantineProvider,
        { env: "test" },
        React.createElement(LoyaltyPointsTable, {
          corporations,
          types,
          offers,
        }),
      ),
    );
  const body = () => screen.getAllByRole("rowgroup")[1]!;

  it("filters offers by corporation name", async () => {
    renderFilterable();
    await userEvent.click(
      screen.getByRole("button", { name: "Filter Corporation" }),
    );
    await userEvent.click(
      await screen.findByRole("combobox", { name: "Filter Corporation" }),
    );
    // The options are the corporations' names, not their ids.
    await userEvent.click(screen.getByRole("option", { name: "Corp B" }));

    expect(within(body()).getByText("2,500 LP")).toBeInTheDocument();
    expect(within(body()).queryByText("5,000 LP")).not.toBeInTheDocument();
  });

  it("filters offers by an LP cost range", async () => {
    renderFilterable();
    await userEvent.click(
      screen.getByRole("button", { name: "Filter LP Cost" }),
    );
    await userEvent.type(
      await screen.findByRole("textbox", { name: "Min" }),
      "3000",
    );

    expect(within(body()).getByText("5,000 LP")).toBeInTheDocument();
    expect(within(body()).queryByText("2,500 LP")).not.toBeInTheDocument();
  });
});

describe("LoyaltyPointsTable — zero-LP offers (divide-by-zero guard)", () => {
  const zeroLpOffer = {
    offerId: 9001,
    corporationId: 1,
    typeId: 100,
    quantity: 1,
    akCost: null,
    lpCost: 0,
    iskCost: 0,
    requiredItems: [],
  };

  beforeEach(() => {
    (useFuzzworkRegionalMarketAggregates as jest.Mock).mockReturnValue({
      data: { 100: MARKET_STATS, 200: MARKET_STATS },
    });
  });

  it.each(["tanstack", "mantine-datatable"] as const)(
    "renders a blank ISK/LP (never Infinity) for a 0 LP cost offer — %s engine",
    (engine) => {
      usePreferencesStore.setState({ dataTableEngine: engine });
      wrap(
        React.createElement(LoyaltyPointsTable, {
          corporations: singleCorp,
          types,
          offers: [zeroLpOffer],
        }),
      );
      // The row rendered (LP Cost cell shows "0 LP") ...
      expect(screen.getByText("0 LP")).toBeInTheDocument();
      // ... but the lpCost > 0 guard yields a blank ISK/LP cell, never the
      // Infinity / NaN that an unguarded divide-by-zero would produce.
      expect(screen.queryByText(/Infinity/)).not.toBeInTheDocument();
      expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
    },
  );
});
