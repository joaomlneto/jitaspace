import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";

const mockUseSelectedCharacter = jest.fn();
const mockUseCharacterAssets =
  jest.fn<() => { assets: Record<number, object>; isLoading: boolean }>();
const mockUseEsiNameLookup =
  jest.fn<() => Record<string, { value?: { name: string } } | undefined>>();
const mockUseMarketPrices =
  jest.fn<() => { data: Record<number, { adjusted_price?: number }> }>();

jest.mock("@jitaspace/hooks", () => ({
  useSelectedCharacter: () => mockUseSelectedCharacter(),
  useCharacterAssets: (...args: unknown[]) => mockUseCharacterAssets(...args),
  useEsiNameLookup: (...args: unknown[]) => mockUseEsiNameLookup(...args),
  useMarketPrices: () => mockUseMarketPrices(),
}));

jest.mock("@jitaspace/ui", () => ({
  ISKAmount: ({ amount }: { amount: number; span?: boolean }) => (
    <span data-testid="isk-amount">{amount.toFixed(2)}</span>
  ),
}));

// AssetLocationSelect moved to @jitaspace/eve-components.
jest.mock("@jitaspace/eve-components", () => ({
  AssetLocationSelect: ({
    onChange,
  }: {
    onChange?: (v: string | null, opts: object) => void;
  }) => (
    <select
      data-testid="location-select"
      aria-label="Filter by location"
      onChange={(e) => onChange?.(e.target.value || null, {})}
    >
      <option value="">All</option>
      <option value="60003760">Jita</option>
      <option value="60008526">Amarr</option>
    </select>
  ),
}));

jest.mock("@jitaspace/eve-icons", () => ({
  AssetsIcon: () => null,
}));

jest.mock("~/components/Assets/AssetsDataTable", () => ({
  AssetsDataTable: ({ entries }: { entries: unknown[] }) => (
    <div data-testid="assets-table">{entries.length} entries</div>
  ),
}));

jest.mock("~/components/ScopeGuard", () => ({
  ScopeGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const SAMPLE_ASSETS = {
  1001: {
    item_id: 1001,
    type_id: 34,
    quantity: 500,
    location_id: 60003760,
    location_type: "station",
    is_singleton: false,
    is_blueprint_copy: false,
  },
  1002: {
    item_id: 1002,
    type_id: 35,
    quantity: 100,
    location_id: 60003760,
    location_type: "item", // filtered out
    is_singleton: false,
    is_blueprint_copy: false,
  },
  1003: {
    item_id: 1003,
    type_id: 36,
    quantity: 200,
    location_id: 60008526,
    location_type: "station",
    is_singleton: false,
    is_blueprint_copy: false,
  },
};

function renderPage() {
  const Page = require("~/app/assets/character/page").default;
  return render(
    <MantineProvider>
      <Page />
    </MantineProvider>,
  );
}

describe("Character Assets Page", () => {
  beforeEach(() => {
    mockUseSelectedCharacter.mockReturnValue({ characterId: 123456789 });
    mockUseCharacterAssets.mockReturnValue({
      assets: SAMPLE_ASSETS,
      isLoading: false,
    });
    mockUseEsiNameLookup.mockReturnValue({
      "34": { value: { name: "Tritanium" } },
      "36": { value: { name: "Mexallon" } },
    });
    mockUseMarketPrices.mockReturnValue({ data: {} });
  });

  it("renders the Assets title", () => {
    renderPage();
    expect(screen.getByText("Assets")).toBeInTheDocument();
  });

  it("passes the character ID to useCharacterAssets", () => {
    renderPage();
    expect(mockUseCharacterAssets).toHaveBeenCalledWith(123456789);
  });

  it("shows the total asset count", () => {
    renderPage();
    // Object.keys(SAMPLE_ASSETS).length = 3
    expect(screen.getByText("3 assets")).toBeInTheDocument();
  });

  it("filters out assets with location_type 'item'", () => {
    renderPage();
    // 3 total assets, 1 has location_type=item → 2 rendered
    expect(screen.getByTestId("assets-table")).toHaveTextContent("2 entries");
  });

  it("shows the total ISK value", () => {
    mockUseMarketPrices.mockReturnValue({
      data: {
        34: { adjusted_price: 5 }, // 500 * 5 = 2500
        36: { adjusted_price: 10 }, // 200 * 10 = 2000
      },
    });
    renderPage();
    expect(screen.getByTestId("isk-amount")).toHaveTextContent("4500.00");
  });

  it("shows a resolving-names message when names are still loading", () => {
    mockUseEsiNameLookup.mockReturnValue({});
    renderPage();
    expect(screen.getByText(/Resolving names for/)).toBeInTheDocument();
  });

  it("does not show the resolving message once all names are loaded", () => {
    renderPage();
    expect(screen.queryByText(/Resolving names for/)).not.toBeInTheDocument();
  });

  it("shows filtered count and updates the table when name filter is applied", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("Filter by name"), {
      target: { value: "Tritanium" },
    });
    expect(screen.getByText(/Showing 1\/3 assets/)).toBeInTheDocument();
    expect(screen.getByTestId("assets-table")).toHaveTextContent("1 entries");
  });

  it("shows filtered count when location filter is applied", () => {
    renderPage();
    fireEvent.change(screen.getByTestId("location-select"), {
      target: { value: "60003760" },
    });
    // Only SAMPLE_ASSETS[1001] is at 60003760 with location_type=station
    expect(screen.getByText(/Showing 1\/3 assets/)).toBeInTheDocument();
    expect(screen.getByTestId("assets-table")).toHaveTextContent("1 entries");
  });

  it("renders the AssetsDataTable", () => {
    renderPage();
    expect(screen.getByTestId("assets-table")).toBeInTheDocument();
  });

  it("renders without crashing when assets is empty", () => {
    mockUseCharacterAssets.mockReturnValue({ assets: {}, isLoading: false });
    renderPage();
    expect(screen.getByText("0 assets")).toBeInTheDocument();
  });
});
