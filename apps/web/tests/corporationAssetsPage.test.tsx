import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

const mockUseSelectedCharacter = jest.fn();
const mockUseCorporationAssets = jest.fn<
  () => {
    assets: Record<number, object>;
    isLoading: boolean;
    errorMessage?: string;
  }
>();
const mockUseEsiNameLookup = jest.fn<
  () => Record<string, { value?: { name: string } } | undefined>
>();
const mockUseMarketPrices = jest.fn<
  () => { data: Record<number, { adjusted_price?: number }> }
>();

jest.mock("@jitaspace/hooks", () => ({
  useSelectedCharacter: () => mockUseSelectedCharacter(),
  useCorporationAssets: (...args: unknown[]) =>
    mockUseCorporationAssets(...args),
  useEsiNameLookup: (...args: unknown[]) => mockUseEsiNameLookup(...args),
  useMarketPrices: () => mockUseMarketPrices(),
}));

jest.mock("@jitaspace/ui", () => ({
  TypeAvatar: () => null,
  TypeAnchor: ({ children }: { children: ReactNode }) => (
    <span>{children}</span>
  ),
  TypeName: ({ typeId }: { typeId: number }) => (
    <span data-testid={`type-name-${typeId}`}>{typeId}</span>
  ),
  EveEntityAnchor: ({ children }: { children: ReactNode }) => (
    <span>{children}</span>
  ),
  EveEntityName: ({ entityId }: { entityId: number }) => (
    <span data-testid={`entity-name-${entityId}`}>{entityId}</span>
  ),
}));

jest.mock("@jitaspace/eve-icons", () => ({
  AssetsIcon: () => null,
  AttentionIcon: () => null,
}));

jest.mock("~/components/ScopeGuard", () => ({
  ScopeGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const SAMPLE_ASSETS = {
  2001: {
    item_id: 2001,
    type_id: 34,
    quantity: 1000,
    location_id: 60003760,
    location_type: "station",
    is_singleton: false,
    is_blueprint_copy: false,
  },
  2002: {
    item_id: 2002,
    type_id: 35,
    quantity: 50,
    location_id: 60003760,
    location_type: "item", // filtered out
    is_singleton: false,
    is_blueprint_copy: false,
  },
  2003: {
    item_id: 2003,
    type_id: 36,
    quantity: 300,
    location_id: 60008526,
    location_type: "station",
    is_singleton: true,
    is_blueprint_copy: false,
  },
  2004: {
    item_id: 2004,
    type_id: 37,
    quantity: 1,
    location_id: 60008526,
    location_type: "station",
    is_singleton: false,
    is_blueprint_copy: true,
  },
};

function renderPage() {
  const Page = require("~/app/assets/corporation/page").default;
  return render(
    <MantineProvider>
      <Page />
    </MantineProvider>,
  );
}

describe("Corporation Assets Page", () => {
  beforeEach(() => {
    mockUseSelectedCharacter.mockReturnValue({
      corporationId: 987654321,
      characterId: 123456789,
    });
    mockUseCorporationAssets.mockReturnValue({
      assets: SAMPLE_ASSETS,
      isLoading: false,
      errorMessage: undefined,
    });
    mockUseEsiNameLookup.mockReturnValue({
      "34": { value: { name: "Tritanium" } },
      "36": { value: { name: "Mexallon" } },
      "37": { value: { name: "Isogen" } },
    });
    mockUseMarketPrices.mockReturnValue({ data: {} });
  });

  it("renders the Corporation Assets title", () => {
    renderPage();
    expect(screen.getByText("Corporation Assets")).toBeInTheDocument();
  });

  it("passes the corporation ID to useCorporationAssets", () => {
    renderPage();
    expect(mockUseCorporationAssets).toHaveBeenCalledWith(987654321);
  });

  it("shows total asset count", () => {
    renderPage();
    // Object.keys(SAMPLE_ASSETS).length = 4
    expect(screen.getByText("4 assets")).toBeInTheDocument();
  });

  it("filters out assets with location_type 'item'", () => {
    renderPage();
    // 2002 has location_type=item, so 3 rows should render
    expect(screen.getAllByRole("row")).toHaveLength(4); // 1 header + 3 data rows
  });

  it("shows an error alert when errorMessage is set", () => {
    mockUseCorporationAssets.mockReturnValue({
      assets: {},
      isLoading: false,
      errorMessage: "Forbidden",
    });
    renderPage();
    expect(screen.getByText("Forbidden")).toBeInTheDocument();
    expect(screen.getByText("Error!")).toBeInTheDocument();
  });

  it("does not show the table when there is an error", () => {
    mockUseCorporationAssets.mockReturnValue({
      assets: {},
      isLoading: false,
      errorMessage: "Forbidden",
    });
    renderPage();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows 'assembled' badge for singleton items", () => {
    renderPage();
    expect(screen.getByText("assembled")).toBeInTheDocument();
  });

  it("shows 'BPC' badge for blueprint copies", () => {
    renderPage();
    expect(screen.getByText("BPC")).toBeInTheDocument();
  });

  it("renders without crashing when assets is empty", () => {
    mockUseCorporationAssets.mockReturnValue({
      assets: {},
      isLoading: false,
      errorMessage: undefined,
    });
    renderPage();
    expect(screen.getByText("0 assets")).toBeInTheDocument();
  });

  it("shows unresolved-names warning when some names are missing", () => {
    mockUseEsiNameLookup.mockReturnValue({});
    renderPage();
    expect(screen.getByText(/Failed to resolve names for/)).toBeInTheDocument();
  });
});
