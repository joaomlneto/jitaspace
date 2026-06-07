import "@testing-library/jest-dom/jest-globals";

import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// @jitaspace/hooks is redirected to __mocks__/@jitaspace/hooks.ts via
// moduleNameMapper — import the stub's jest.fn() directly so tests can
// configure return values without needing their own jest.mock() calls.
import {
  useFuzzworkRegionalMarketAggregates,
  type FuzzworkTypeMarketAggregate,
} from "@jitaspace/hooks";

// @jitaspace/ui is redirected to __mocks__/@jitaspace/ui.tsx via moduleNameMapper
// (same reason as hooks — real source pulls in @tabler/icons-react ESM bundles).

// ---------------------------------------------------------------------------
// Component under test (imported after mocks are registered)
// @jitaspace/datatable is loaded via moduleNameMapper → real source → SWC
// ---------------------------------------------------------------------------
import { LoyaltyPointsTable } from "../components/LPStore/LoyaltyPointsTable";

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

  it("renders item type names via TypeName stub", () => {
    wrap(
      React.createElement(LoyaltyPointsTable, {
        corporations,
        types,
        offers,
      }),
    );
    expect(screen.getAllByTestId("type-name").length).toBeGreaterThan(0);
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
