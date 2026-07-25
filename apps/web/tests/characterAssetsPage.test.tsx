import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";

/**
 * Render test for the /assets/character page. The @jitaspace/hooks module is
 * mocked so the page renders with a fixed character + fixture assets; the
 * @jitaspace/ui + @jitaspace/eve-components imports resolve to the jest stubs
 * (whose TypeAnchor renders its children, so resolved item names are assertable
 * text). This covers the header, summary stats, loading/empty states and the
 * search ⇄ location-tree switch.
 */

const mockUseSelectedCharacter = jest.fn();
const mockUseCharacterAssets =
  jest.fn<
    (characterId?: number) => { assets: Record<number, object>; isLoading: boolean }
  >();
const mockUseEsiNameLookup =
  jest.fn<() => Record<string, { value?: { name: string } } | undefined>>();
const mockUseMarketPrices =
  jest.fn<() => { data: Record<number, { adjusted_price?: number }> }>();

jest.mock("@jitaspace/hooks", () => ({
  useSelectedCharacter: () => mockUseSelectedCharacter(),
  useCharacterAssets: (characterId?: number) =>
    mockUseCharacterAssets(characterId),
  useEsiNameLookup: () => mockUseEsiNameLookup(),
  useMarketPrices: () => mockUseMarketPrices(),
}));

jest.mock("@jitaspace/eve-icons", () => new Proxy({}, { get: () => () => null }));

// Render past the scope gate; ScopeGuard itself is unit-tested elsewhere.
jest.mock("~/components/ScopeGuard", () => ({
  ScopeGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// A Rifter (with one fitted module) and a Tritanium stack, both in Jita.
const JITA = 60003760;
const SHIP = 1001;
const SAMPLE_ASSETS = {
  1001: { item_id: SHIP, type_id: 587, quantity: 1, location_id: JITA, location_flag: "Hangar", location_type: "station", is_singleton: true },
  2001: { item_id: 2001, type_id: 3001, quantity: 1, location_id: SHIP, location_flag: "HiSlot0", location_type: "item", is_singleton: true },
  1002: { item_id: 1002, type_id: 34, quantity: 500, location_id: JITA, location_flag: "Hangar", location_type: "station", is_singleton: false },
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
    mockUseSelectedCharacter.mockReturnValue({
      characterId: 123456789,
      accessTokenPayload: { scp: ["esi-assets.read_assets.v1"] },
    });
    mockUseCharacterAssets.mockReturnValue({
      assets: SAMPLE_ASSETS,
      isLoading: false,
    });
    mockUseEsiNameLookup.mockReturnValue({
      "587": { value: { name: "Rifter" } },
      "3001": { value: { name: "125mm Gatling AutoCannon II" } },
      "34": { value: { name: "Tritanium" } },
    });
    mockUseMarketPrices.mockReturnValue({ data: {} });
  });

  it("renders the header and summary stats", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Assets" })).toBeInTheDocument();
    expect(screen.getByText("Value")).toBeInTheDocument();
    expect(screen.getByText("Items")).toBeInTheDocument();
    expect(screen.getByText("Locations")).toBeInTheDocument();
    // Three stacks total (ship + fitted module + trit).
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("passes the selected character id to the assets hook", () => {
    renderPage();
    expect(mockUseCharacterAssets).toHaveBeenCalledWith(123456789);
  });

  it("auto-expands the sole location so its contents are visible", () => {
    renderPage();
    // One location holding three stacks; a single location opens automatically.
    expect(screen.getByText("3 items")).toBeInTheDocument();
    expect(screen.getByText("Rifter")).toBeInTheDocument();
    expect(screen.getByText("Tritanium")).toBeInTheDocument();
  });

  it("switches to search results as you type and back when cleared", async () => {
    renderPage();
    const input = screen.getByPlaceholderText("Search items…");

    fireEvent.change(input, { target: { value: "rif" } });
    expect(await screen.findByText("Rifter")).toBeInTheDocument();
    expect(screen.getByText("1 match")).toBeInTheDocument();
    // The location panel is replaced by the results list.
    expect(screen.queryByText("3 items")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Clear search"));
    expect(await screen.findByText("3 items")).toBeInTheDocument();
  });

  it("shows a loading state while the first assets are still loading", () => {
    mockUseCharacterAssets.mockReturnValue({ assets: {}, isLoading: true });
    renderPage();
    expect(screen.getByText("Loading your assets…")).toBeInTheDocument();
  });

  it("shows an empty state when the character owns nothing", () => {
    mockUseCharacterAssets.mockReturnValue({ assets: {}, isLoading: false });
    renderPage();
    expect(
      screen.getByText(/No assets found for this character/),
    ).toBeInTheDocument();
  });
});
