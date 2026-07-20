import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, within } from "@testing-library/react";

import type { CharacterAsset } from "@jitaspace/hooks";

import { AssetSearchResults } from "~/components/Assets/AssetSearchResults";
import { buildAssetTree } from "~/components/Assets/assetTree";
import { CharacterAssetsTree } from "~/components/Assets/AssetTreeView";

/**
 * Render tests for the Character Assets browser UI. The @jitaspace/ui and
 * @jitaspace/eve-components imports resolve to the jest stubs, whose TypeAnchor
 * renders its children — so the resolved item names are assertable text. This
 * exercises the collapsible location panels, the recursive item nodes, the
 * ship-fit section grouping and the search results, which the pure-logic tests
 * in assetTree.test.ts cannot reach.
 */

const JITA = 60003760;
const AMARR = 60008494;
const SHIP = 1001;
const CONTAINER = 1003;

const asset = (
  a: Pick<
    CharacterAsset,
    "item_id" | "type_id" | "quantity" | "location_id" | "location_flag" | "location_type"
  > &
    Partial<CharacterAsset>,
): CharacterAsset => ({ is_singleton: false, ...a });

const fixture: Record<string, CharacterAsset> = {
  1001: asset({ item_id: SHIP, type_id: 641, quantity: 1, location_id: JITA, location_flag: "Hangar", location_type: "station", is_singleton: true }),
  2001: asset({ item_id: 2001, type_id: 3001, quantity: 1, location_id: SHIP, location_flag: "HiSlot0", location_type: "item", is_singleton: true }),
  2002: asset({ item_id: 2002, type_id: 222, quantity: 5000, location_id: SHIP, location_flag: "Cargo", location_type: "item" }),
  1002: asset({ item_id: 1002, type_id: 34, quantity: 1_000_000, location_id: JITA, location_flag: "Hangar", location_type: "station" }),
  1003: asset({ item_id: CONTAINER, type_id: 3465, quantity: 1, location_id: AMARR, location_flag: "Hangar", location_type: "station", is_singleton: true }),
  2003: asset({ item_id: 2003, type_id: 34, quantity: 50, location_id: CONTAINER, location_flag: "Unlocked", location_type: "item" }),
};

const names: Record<number, string> = {
  641: "Megathron",
  3001: "425mm Railgun II",
  222: "Antimatter Charge M",
  34: "Tritanium",
  3465: "Giant Secure Container",
};
const getTypeName = (id: number) => names[id];

const prices = {
  641: { adjusted_price: 100_000_000 },
  3001: { adjusted_price: 1_000_000 },
  222: { adjusted_price: 100 },
  34: { adjusted_price: 5 },
  3465: { adjusted_price: 2_000_000 },
};

const tree = buildAssetTree(fixture, prices);

function renderTree() {
  const { container } = render(
    <MantineProvider>
      <CharacterAssetsTree tree={tree} getTypeName={getTypeName} />
    </MantineProvider>,
  );
  return within(container);
}

/** Click the collapsible header/row that contains the given text. */
function expandRowWith(scope: ReturnType<typeof within>, text: string) {
  const button = scope.getByText(text).closest('[role="button"]');
  if (!button) throw new Error(`No expandable row found for "${text}"`);
  fireEvent.click(button);
}

describe("CharacterAssetsTree", () => {
  it("renders one collapsed panel per location with a stack count", () => {
    const view = renderTree();
    // Two locations; contents hidden until expanded.
    expect(view.getByText("4 items")).toBeInTheDocument(); // Jita: ship+2 fitted+trit
    expect(view.getByText("2 items")).toBeInTheDocument(); // Amarr: container+loot
    expect(view.queryByText("Megathron")).not.toBeInTheDocument();
  });

  it("reveals a location's top-level items when expanded", async () => {
    const view = renderTree();
    expandRowWith(view, "4 items"); // the Jita panel
    expect(await view.findByText("Megathron")).toBeInTheDocument();
    expect(view.getByText("Tritanium")).toBeInTheDocument();
    // The fitted ship advertises how many stacks it holds.
    expect(view.getByText("2 inside")).toBeInTheDocument();
    // A single hangar section is rendered flat (no "High Slots" sub-header yet).
    expect(view.queryByText("High Slots")).not.toBeInTheDocument();
  });

  it("groups a ship's contents into fitting sections when drilled into", async () => {
    const view = renderTree();
    expandRowWith(view, "4 items"); // Jita
    await view.findByText("Megathron");
    expandRowWith(view, "Megathron"); // drill into the ship
    // Two distinct flags -> section sub-headers appear.
    expect(await view.findByText("High Slots")).toBeInTheDocument();
    expect(view.getByText("Cargo Hold")).toBeInTheDocument();
    expect(view.getByText("425mm Railgun II")).toBeInTheDocument();
    expect(view.getByText("Antimatter Charge M")).toBeInTheDocument();
  });
});

describe("AssetSearchResults", () => {
  function renderSearch(query: string) {
    return render(
      <MantineProvider>
        <AssetSearchResults query={query} tree={tree} getTypeName={getTypeName} />
      </MantineProvider>,
    );
  }

  it("lists every matching stack ranked by value", () => {
    renderSearch("trit");
    // Two Tritanium stacks match (top-level + loot inside the container).
    expect(screen.getByText("2 matches")).toBeInTheDocument();
    expect(screen.getAllByText("Tritanium")).toHaveLength(2);
    // The nested stack shows the container it lives in.
    expect(screen.getByText(/in Giant Secure Container/)).toBeInTheDocument();
  });

  it("matches are case-insensitive and singular is grammatical", () => {
    renderSearch("MEGA");
    expect(screen.getByText("1 match")).toBeInTheDocument();
    expect(screen.getByText("Megathron")).toBeInTheDocument();
  });

  it("shows an empty state when nothing matches", () => {
    renderSearch("zzznope");
    expect(screen.getByText(/No items match/)).toBeInTheDocument();
  });
});
