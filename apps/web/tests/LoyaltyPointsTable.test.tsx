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
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { FuzzworkTypeMarketAggregate } from "@jitaspace/hooks";
import {
  useCharacterAssets,
  useCharacterLoyaltyPoints,
  useCharacterWalletBalance,
  useFuzzworkRegionalMarketAggregates,
  useSelectedCharacter,
} from "@jitaspace/hooks";

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

describe("LoyaltyPointsTable — offers shared between stores", () => {
  // An offer id is only unique within one corporation's store; most offers
  // are in several. /lp-store/all lists every store in one table, and keying
  // rows by offer id alone duplicated and dropped rows once they were sorted.
  const shared = [
    { ...offers[0]!, offerId: 7, corporationId: 1, lpCost: 1111 },
    { ...offers[0]!, offerId: 7, corporationId: 2, lpCost: 2222 },
    { ...offers[1]!, offerId: 8, corporationId: 2, lpCost: 3333 },
  ];

  beforeEach(() => {
    (useFuzzworkRegionalMarketAggregates as jest.Mock).mockReturnValue({
      data: {},
    });
  });

  it.each(["tanstack", "mantine-datatable"] as const)(
    "renders each offer exactly once after sorting — %s engine",
    async (engine) => {
      usePreferencesStore.setState({ dataTableEngine: engine });
      wrap(
        React.createElement(LoyaltyPointsTable, {
          corporations,
          types,
          offers: shared,
        }),
      );
      const lpCostHeader = screen.getByText("LP Cost").closest("th")!;
      await userEvent.click(lpCostHeader);
      await userEvent.click(lpCostHeader);

      const lpCells = screen
        .getAllByText(/^[\d,]+ LP$/)
        .map((cell) => cell.textContent);
      expect(lpCells.sort()).toEqual(["1,111 LP", "2,222 LP", "3,333 LP"]);
    },
  );
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

describe("LoyaltyPointsTable — only offers I have the LP / ISK / items for", () => {
  // Pinned, not imported: renaming one would silently reset everyone's toggle.
  const KEYS = {
    lp: "jitaspace/lp-store-only-enough-lp",
    isk: "jitaspace/lp-store-only-enough-isk",
    items: "jitaspace/lp-store-only-required-items",
  };
  const lpSwitch = () =>
    screen.getByRole("switch", { name: /^Only offers I have the LP for/ });
  const iskSwitch = () =>
    screen.getByRole("switch", { name: /^Only offers I have the ISK for/ });
  const itemsSwitch = () =>
    screen.getByRole("switch", { name: /^Only offers I have the items for/ });
  const renderTable = (tableOffers = offers) =>
    wrap(
      React.createElement(LoyaltyPointsTable, {
        corporations,
        types,
        offers: tableOffers,
      }),
    );

  // Offer 1001: Corp A, 5,000 LP + 100,000 ISK + 2 × type 200.
  // Offer 1002: Corp B, 2,500 LP + 50,000 ISK + 100 AK, no items.
  const signIn = ({
    loyaltyPoints = {},
    isk = 0,
    owned = [],
    lp = {},
    wallet = {},
    assets = {},
  }: {
    loyaltyPoints?: Record<number, number>;
    isk?: number;
    owned?: { type_id: number; quantity: number }[];
    lp?: Record<string, unknown>;
    wallet?: Record<string, unknown>;
    assets?: Record<string, unknown>;
  } = {}) => {
    (useSelectedCharacter as jest.Mock).mockReturnValue({ characterId: 9 });
    (useCharacterLoyaltyPoints as jest.Mock).mockReturnValue({
      hasToken: true,
      loyaltyPointsMap: loyaltyPoints,
      isLoading: false,
      data: { data: [] },
      ...lp,
    });
    (useCharacterWalletBalance as jest.Mock).mockReturnValue({
      isAllowed: true,
      isLoading: false,
      data: { data: isk },
      ...wallet,
    });
    (useCharacterAssets as jest.Mock).mockReturnValue({
      hasToken: true,
      // Split across two stacks, as assets in different hangars would be.
      assets: Object.fromEntries(
        owned.flatMap(({ type_id, quantity }, i) => [
          [`${i}a`, { item_id: i * 2, type_id, quantity: quantity - 1 }],
          [`${i}b`, { item_id: i * 2 + 1, type_id, quantity: 1 }],
        ]),
      ),
      isLoading: false,
      hasNextPage: false,
      hasData: true,
      error: null,
      ...assets,
    });
  };

  beforeEach(() => {
    window.localStorage.clear();
    (useFuzzworkRegionalMarketAggregates as jest.Mock).mockReturnValue({
      data: {},
    });
    (useSelectedCharacter as jest.Mock).mockReturnValue(null);
    (useCharacterLoyaltyPoints as jest.Mock).mockReturnValue({
      hasToken: false,
      loyaltyPointsMap: {},
      isLoading: false,
    });
    (useCharacterWalletBalance as jest.Mock).mockReturnValue({
      isAllowed: false,
      isLoading: false,
    });
    (useCharacterAssets as jest.Mock).mockReturnValue({
      hasToken: false,
      assets: {},
      isLoading: false,
      hasNextPage: false,
      error: null,
    });
  });

  it("renders all three, disabled when signed out, each saying what it needs", () => {
    renderTable();
    for (const [toggle, scope] of [
      [lpSwitch, "loyalty points"],
      [iskSwitch, "wallet"],
      [itemsSwitch, "assets"],
    ] as const) {
      expect(toggle()).toBeDisabled();
      expect(toggle()).not.toBeChecked();
      expect(toggle()).toHaveAccessibleDescription(
        new RegExp(`granted access to its ${scope}$`),
      );
    }
    expect(screen.getByText("5,000 LP")).toBeInTheDocument();
    expect(screen.getByText("2,500 LP")).toBeInTheDocument();
  });

  it("LP: hides only offers you lack the LP for", () => {
    // No ISK and no items: the LP toggle must not care.
    signIn({ loyaltyPoints: { 1: 5000 } });
    renderTable();
    fireEvent.click(lpSwitch());
    expect(lpSwitch()).toBeChecked();
    expect(screen.getByText("5,000 LP")).toBeInTheDocument();
    expect(screen.queryByText("2,500 LP")).toBeNull();
  });

  it("ISK: hides only offers you lack the ISK for", () => {
    signIn({ isk: 60_000 });
    renderTable();
    fireEvent.click(iskSwitch());
    expect(screen.queryByText("5,000 LP")).toBeNull(); // 100,000 ISK
    expect(screen.getByText("2,500 LP")).toBeInTheDocument(); // 50,000 ISK
  });

  it("items: hides only offers whose required items you don't own enough of", () => {
    signIn({ owned: [{ type_id: 200, quantity: 1 }] });
    renderTable();
    fireEvent.click(itemsSwitch());
    expect(screen.queryByText("5,000 LP")).toBeNull(); // needs 2 × type 200
    expect(screen.getByText("2,500 LP")).toBeInTheDocument(); // needs none
  });

  it("combines the filters that are on", () => {
    signIn({ loyaltyPoints: { 1: 5000, 2: 2500 }, isk: 60_000 });
    renderTable();
    fireEvent.click(lpSwitch());
    expect(screen.getByText("5,000 LP")).toBeInTheDocument();
    fireEvent.click(iskSwitch());
    expect(screen.queryByText("5,000 LP")).toBeNull();
    expect(screen.getByText("2,500 LP")).toBeInTheDocument();
  });

  it("says so when no offer passes", () => {
    signIn();
    renderTable();
    fireEvent.click(lpSwitch());
    expect(
      screen.getByText("No offers pass the filters above."),
    ).toBeInTheDocument();
  });

  it("needs only its own scope: without wallet access only ISK is disabled", () => {
    signIn({
      loyaltyPoints: { 1: 5000 },
      wallet: { isAllowed: false, data: undefined },
    });
    renderTable();
    expect(iskSwitch()).toBeDisabled();
    expect(iskSwitch()).toHaveAccessibleDescription(
      /granted access to its wallet$/,
    );
    expect(lpSwitch()).toBeEnabled();
    expect(itemsSwitch()).toBeEnabled();
  });

  it("shows skeleton rows while a filter that is on loads its data", async () => {
    window.localStorage.setItem(KEYS.items, "true");
    signIn({ assets: { hasNextPage: true } }); // assets still walking pages
    renderTable();
    await waitFor(() => expect(itemsSwitch()).toBeChecked());
    expect(itemsSwitch()).toBeEnabled(); // can be turned off while it loads
    expect(screen.queryByText("5,000 LP")).toBeNull();
    expect(screen.queryByText("2,500 LP")).toBeNull();
    // The others are unaffected.
    expect(lpSwitch()).toBeEnabled();
  });

  it("shows the reason, switch off, when its request failed", () => {
    window.localStorage.setItem(KEYS.items, "true");
    signIn({ assets: { error: new Error("ESI 502"), hasNextPage: true } });
    renderTable();
    expect(itemsSwitch()).toBeDisabled();
    expect(itemsSwitch()).not.toBeChecked();
    expect(itemsSwitch()).toHaveAccessibleDescription(
      /Couldn't load your assets$/,
    );
    expect(screen.getByText("5,000 LP")).toBeInTheDocument();
    expect(screen.getByText("2,500 LP")).toBeInTheDocument();
  });

  it("notes AK isn't checked, only where offers cost AK", () => {
    const { unmount } = renderTable();
    expect(lpSwitch()).toHaveAccessibleDescription(/AK costs aren't checked/);
    unmount();
    renderTable(offers.map((offer) => ({ ...offer, akCost: null })));
    expect(lpSwitch()).not.toHaveAccessibleDescription(/AK/);
  });

  it("fetches each piece of data only while its toggle is on", () => {
    signIn();
    renderTable();
    // Browsing with every toggle off fetches nothing: not even the asset walk.
    for (const hook of [
      useCharacterLoyaltyPoints,
      useCharacterWalletBalance,
      useCharacterAssets,
    ]) {
      expect(hook).toHaveBeenLastCalledWith(9, { enabled: false });
    }
    fireEvent.click(itemsSwitch());
    expect(useCharacterAssets).toHaveBeenLastCalledWith(9, { enabled: true });
    expect(useCharacterWalletBalance).toHaveBeenLastCalledWith(9, {
      enabled: false,
    });
  });

  it("can be turned on before its data is fetched", () => {
    // Scope granted, nothing requested yet.
    signIn({ assets: { hasData: false, assets: {} } });
    renderTable();
    expect(itemsSwitch()).toBeEnabled();
    expect(itemsSwitch()).not.toBeChecked();
    expect(itemsSwitch()).not.toHaveAccessibleDescription(/Couldn't|Sign in/);
  });

  it("asks for character 0, not any character, when none is selected", () => {
    signIn();
    (useSelectedCharacter as jest.Mock).mockReturnValue(null);
    renderTable();
    expect(useCharacterWalletBalance).toHaveBeenLastCalledWith(0, {
      enabled: false,
    });
    expect(useCharacterAssets).toHaveBeenLastCalledWith(0, { enabled: false });
  });

  it("keeps filtering on the last full asset walk when a refetch fails", () => {
    window.localStorage.setItem(KEYS.items, "true");
    signIn({
      owned: [{ type_id: 200, quantity: 1 }],
      assets: { error: new Error("ESI 502") }, // every page still cached
    });
    renderTable();
    expect(itemsSwitch()).toBeEnabled();
    expect(screen.queryByText("5,000 LP")).toBeNull();
    expect(screen.getByText("2,500 LP")).toBeInTheDocument();
  });

  it("names each switch by its label alone, with the caveat as its description", () => {
    renderTable();
    expect(
      screen.getByRole("switch", { name: "Only offers I have the LP for" }),
    ).toHaveAccessibleDescription(/^AK costs aren't checked/);
  });

  it("remembers each toggle on its own", async () => {
    signIn({ loyaltyPoints: { 1: 5000 } });
    const { unmount } = renderTable();
    fireEvent.click(lpSwitch());
    expect(window.localStorage.getItem(KEYS.lp)).toBe("true");
    // Mantine stores the default on mount, so "not on" rather than absent.
    expect(window.localStorage.getItem(KEYS.isk)).not.toBe("true");
    expect(window.localStorage.getItem(KEYS.items)).not.toBe("true");
    unmount();

    renderTable();
    await waitFor(() => expect(lpSwitch()).toBeChecked());
    expect(iskSwitch()).not.toBeChecked();
    expect(screen.queryByText("2,500 LP")).toBeNull();
  });
});
