import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// apps/web/app/market/page.client.tsx is a "use client" page. Every
// /market/<typeId> URL is rewritten to this static shell, so it derives the
// selected typeId from the pathname (after mount) rather than a route param,
// then renders buy/sell MarketOrdersDataTables for that type.
// ---------------------------------------------------------------------------

let mockPathname = "/market/34";

jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

const mockUseTypeMarketOrders = jest.fn();
jest.mock("@jitaspace/hooks", () => ({
  useTypeMarketOrders: (...args: unknown[]) => mockUseTypeMarketOrders(...args),
}));

jest.mock("@jitaspace/eve-icons", () => ({
  MarketIcon: () => <span data-testid="market-icon" />,
}));

// TypeAvatar/TypeName come from @jitaspace/eve-components — provide
// identifiable stubs.
jest.mock("@jitaspace/eve-components", () => ({
  TypeAvatar: ({ typeId }: { typeId?: number }) => (
    <span data-testid="type-avatar">{`avatar-${typeId}`}</span>
  ),
  TypeName: ({ typeId }: { typeId?: number }) => (
    <span data-testid="type-name">{`type-${typeId}`}</span>
  ),
}));

// The data table echoes the orders it receives, its sort direction and whether
// it was told to show its loading state, so we can confirm the page split buy vs
// sell orders correctly and reserved the tables' height while they load.
jest.mock("~/components/Market", () => ({
  MarketOrdersDataTable: ({
    orders,
    sortPriceDescending,
    isLoading,
  }: {
    orders?: { order_id: number }[];
    sortPriceDescending?: boolean;
    isLoading?: boolean;
  }) => (
    <div data-testid="orders-table" data-loading={String(isLoading ?? false)}>
      {`orders:${orders?.length ?? 0} desc:${String(sortPriceDescending)}`}
    </div>
  ),
}));

// Two regions' worth of orders, mixing buy and sell.
const ORDERS_BY_REGION = {
  10000002: [
    { order_id: 1, is_buy_order: true, price: 5 },
    { order_id: 2, is_buy_order: false, price: 6 },
  ],
  10000043: [
    { order_id: 3, is_buy_order: false, price: 7 },
    { order_id: 4, is_buy_order: true, price: 4 },
    { order_id: 5, is_buy_order: false, price: 8 },
  ],
};

function renderPage() {
  const Page = require("~/app/market/page.client").default;
  return render(
    <MantineProvider>
      <Page />
    </MantineProvider>,
  );
}

describe("Market page (client)", () => {
  beforeEach(() => {
    mockPathname = "/market/34";
    mockUseTypeMarketOrders.mockReset();
    mockUseTypeMarketOrders.mockReturnValue({
      data: ORDERS_BY_REGION,
      isLoading: false,
    });
  });

  it("renders the type header and splits regional orders into sell + buy tables", () => {
    renderPage();

    // Header chrome always present.
    expect(screen.getByText("Market")).toBeInTheDocument();
    expect(screen.getByTestId("market-icon")).toBeInTheDocument();

    // After mount the typeId is parsed from the path (34) -> type widgets show.
    expect(screen.getByText("avatar-34")).toBeInTheDocument();
    expect(screen.getByText("type-34")).toBeInTheDocument();
    expect(screen.getByText("Sell Orders")).toBeInTheDocument();
    expect(screen.getByText("Buy Orders")).toBeInTheDocument();

    // 5 total orders across regions: 3 sell (ascending) + 2 buy (descending).
    expect(screen.getByText("orders:3 desc:false")).toBeInTheDocument();
    expect(screen.getByText("orders:2 desc:true")).toBeInTheDocument();
  });

  it("puts both order tables in their loading state while orders are still arriving", () => {
    mockUseTypeMarketOrders.mockReturnValue({ data: {}, isLoading: true });

    renderPage();

    // Both tables must reserve their height up front — the buy table sits below
    // the sell table, so a sell table that grows on arrival pushes it down.
    const tables = screen.getAllByTestId("orders-table");
    expect(tables).toHaveLength(2);
    for (const table of tables) {
      expect(table).toHaveAttribute("data-loading", "true");
    }
  });

  it("renders only the header shell when the path has no numeric typeId", () => {
    mockPathname = "/market";
    mockUseTypeMarketOrders.mockReturnValue({ data: {}, isLoading: false });

    renderPage();

    expect(screen.getByText("Market")).toBeInTheDocument();
    // typeId undefined -> the type block (avatar/name/tables) is not rendered.
    expect(screen.queryByTestId("type-avatar")).not.toBeInTheDocument();
    expect(screen.queryByText("Sell Orders")).not.toBeInTheDocument();
    expect(screen.queryByTestId("orders-table")).not.toBeInTheDocument();
  });
});
