import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";

/**
 * Render test for the /assets/character page, which shows every logged-in
 * character's assets. @jitaspace/hooks is mocked so the page renders with
 * fixture assets tagged by owner; the @jitaspace/ui + @jitaspace/eve-components
 * imports resolve to the jest stubs (whose TypeAnchor renders its children, so
 * resolved item names are assertable text). Covers the header, summary stats,
 * loading/empty states, the search ⇄ location-tree switch, the character
 * filter, and the per-character failure notice.
 */

interface TaggedAsset {
  item_id: number;
  subjectId: number;
  [key: string]: unknown;
}
const mockUseMultipleCharacterAssets =
  jest.fn<
    () => {
      data: TaggedAsset[];
      isPending: boolean;
      errors: { subjectId: number; error: Error }[];
    }
  >();
const mockUseEsiNameLookup =
  jest.fn<() => Record<string, { value?: { name: string } } | undefined>>();
const mockUseMarketPrices =
  jest.fn<() => { data: Record<number, { adjusted_price?: number }> }>();

jest.mock("@jitaspace/hooks", () => ({
  useMultipleCharacterAssets: () => mockUseMultipleCharacterAssets(),
  useEsiNameLookup: () => mockUseEsiNameLookup(),
  useMarketPrices: () => mockUseMarketPrices(),
}));

// Keep the shared stub — the asset tree's children need its anchors — and only
// override the select, so a character can actually be picked here.
jest.mock("@jitaspace/eve-components", () => ({
  ...jest.requireActual<Record<string, unknown>>(
    "../__mocks__/@jitaspace/eve-components",
  ),
  EveEntitySelect: ({
    label,
    entityIds,
    onChange,
  }: {
    label?: string;
    entityIds?: { id: number }[];
    onChange?: (value: string | null) => void;
  }) => (
    <div data-testid={`select:${label}`}>
      {(entityIds ?? []).map(({ id }) => (
        <button
          key={id}
          data-testid={`option:${id}`}
          onClick={() => onChange?.(String(id))}
        >
          {id}
        </button>
      ))}
    </div>
  ),
}));

jest.mock("@jitaspace/eve-icons", () => new Proxy({}, { get: () => () => null }));

// Render past the scope gate; ScopeGuard itself is unit-tested elsewhere.
jest.mock("~/components/ScopeGuard", () => ({
  ScopeGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// A Rifter (with one fitted module) belonging to one character, and a Tritanium
// stack belonging to another — both in Jita, so they share a root location.
const JITA = 60003760;
const SHIP = 1001;
const MAIN = 123456789;
const ALT = 987654321;
const SAMPLE_ASSETS: TaggedAsset[] = [
  { item_id: SHIP, subjectId: MAIN, type_id: 587, quantity: 1, location_id: JITA, location_flag: "Hangar", location_type: "station", is_singleton: true },
  { item_id: 2001, subjectId: MAIN, type_id: 3001, quantity: 1, location_id: SHIP, location_flag: "HiSlot0", location_type: "item", is_singleton: true },
  { item_id: 1002, subjectId: ALT, type_id: 34, quantity: 500, location_id: JITA, location_flag: "Hangar", location_type: "station", is_singleton: false },
];

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
    mockUseMultipleCharacterAssets.mockReturnValue({
      data: SAMPLE_ASSETS,
      isPending: false,
      errors: [],
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

  it("merges characters sharing a location into one root", () => {
    renderPage();
    // Both characters keep things in Jita, so it is one location holding all
    // three stacks rather than two locations of the same station.
    expect(screen.getByText("3 items")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("narrows to one character's assets when that character is picked", () => {
    renderPage();
    expect(screen.getByText("3 items")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId(`option:${ALT}`));

    // Only the alt's Tritanium stack remains.
    expect(screen.getByText("1 item")).toBeInTheDocument();
    expect(screen.queryByText("Rifter")).not.toBeInTheDocument();
  });

  it("offers one filter option per character that owns assets", () => {
    renderPage();
    expect(screen.getByTestId(`option:${MAIN}`)).toBeInTheDocument();
    expect(screen.getByTestId(`option:${ALT}`)).toBeInTheDocument();
    // Options come from the assets themselves, which is why a filtered view is
    // never empty and the empty state only has one wording.
    expect(screen.getAllByTestId(/^option:/)).toHaveLength(2);
  });

  it("says how many characters failed rather than omitting them silently", () => {
    mockUseMultipleCharacterAssets.mockReturnValue({
      data: SAMPLE_ASSETS,
      isPending: false,
      errors: [{ subjectId: ALT, error: new Error("boom") }],
    });
    renderPage();
    expect(
      screen.getByText(/could not load assets for 1 character\./i),
    ).toBeInTheDocument();
  });

  it("pluralises when several characters failed", () => {
    mockUseMultipleCharacterAssets.mockReturnValue({
      data: SAMPLE_ASSETS,
      isPending: false,
      errors: [
        { subjectId: MAIN, error: new Error("boom") },
        { subjectId: ALT, error: new Error("boom") },
      ],
    });
    renderPage();
    expect(
      screen.getByText(/could not load assets for 2 characters\./i),
    ).toBeInTheDocument();
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
    mockUseMultipleCharacterAssets.mockReturnValue({
      data: [],
      isPending: true,
      errors: [],
    });
    renderPage();
    expect(screen.getByText("Loading your assets…")).toBeInTheDocument();
  });

  it("shows an empty state when no character owns anything", () => {
    mockUseMultipleCharacterAssets.mockReturnValue({
      data: [],
      isPending: false,
      errors: [],
    });
    renderPage();
    expect(
      screen.getByText(/No assets found for any of your characters/),
    ).toBeInTheDocument();
  });

});
