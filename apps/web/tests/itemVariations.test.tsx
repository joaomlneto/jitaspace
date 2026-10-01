import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, within } from "@testing-library/react";

import type * as ItemVariationsModule from "~/components/Compare/ItemVariations";
import type { ItemVariation } from "~/components/Compare/ItemVariations";

const mockUseMarket = jest.fn<(ids: number[], regionId: number) => unknown>();
jest.mock("@jitaspace/hooks", () => ({
  useFuzzworkRegionalMarketAggregates: (ids: number[], regionId: number) =>
    mockUseMarket(ids, regionId),
}));

// jest.mock is not hoisted in this app's jest setup.
const { ItemVariations } =
  require("~/components/Compare/ItemVariations") as typeof ItemVariationsModule;

const variations: ItemVariation[] = [
  {
    typeId: 3839,
    name: "Large Shield Extender I",
    categoryId: 7,
    metaGroupName: "Tech I",
    metaLevel: 0,
  },
  {
    typeId: 8529,
    name: "Large F-S9 Regolith Compact Shield Extender",
    categoryId: 7,
    metaGroupName: "Tech I",
    metaLevel: 1,
  },
  {
    typeId: 3841,
    name: "Large Shield Extender II",
    categoryId: 7,
    metaGroupName: "Tech II",
    metaLevel: 5,
  },
  {
    typeId: 31930,
    name: "Caldari Navy Large Shield Extender",
    categoryId: 7,
    metaGroupName: "Faction",
    metaLevel: 8,
  },
  { typeId: 99, name: "Unsorted Oddity", categoryId: 6 },
];

const renderVariations = (typeId = 3841, list: ItemVariation[] = variations) =>
  render(
    <MantineProvider env="test">
      <ItemVariations typeId={typeId} variations={list} />
    </MantineProvider>,
  );

const compareLink = () =>
  screen.getByRole("link", { name: /Compare \d+ selected/ });

beforeEach(() => {
  mockUseMarket.mockReturnValue({
    data: {
      3839: { buy: { percentile: 70 }, sell: { percentile: 80000 } },
      3841: { buy: { percentile: 800 }, sell: { percentile: 0 } },
    },
  });
});

describe("ItemVariations", () => {
  it("lists every variation in the given order, marking this item", () => {
    renderVariations();
    const rows = within(screen.getByRole("table", { name: "Variations" }))
      .getAllByRole("row")
      .slice(1);
    expect(
      rows.map((row) => within(row).getByRole("rowheader").textContent),
    ).toEqual([
      "Large Shield Extender I",
      "Large F-S9 Regolith Compact Shield Extender",
      "Large Shield Extender IIThis item",
      "Caldari Navy Large Shield Extender",
      "Unsorted Oddity",
    ]);
    expect(rows[2]).toHaveAttribute("aria-current", "true");
    expect(within(rows[3]!).getByText("Faction")).toBeInTheDocument();
    expect(within(rows[3]!).getByText("8")).toBeInTheDocument();
    // No meta group or level: dashes.
    expect(within(rows[4]!).getAllByText("—")).toHaveLength(2);
    expect(screen.getByText("5 variations")).toBeInTheDocument();
  });

  it("asks for Jita prices of every variation, and says when there are none", () => {
    renderVariations();
    expect(mockUseMarket).toHaveBeenCalledWith(
      [3839, 8529, 3841, 31930, 99],
      10000002,
    );
    const rows = screen.getAllByRole("row");
    expect(within(rows[1]!).getByTestId("isk-amount")).toHaveTextContent(
      "80,000",
    );
    expect(within(rows[3]!).getByText("No orders")).toBeInTheDocument();
  });

  it("shows a placeholder while prices load", () => {
    mockUseMarket.mockReturnValue({ data: null });
    renderVariations();
    expect(screen.getAllByText("…")).toHaveLength(5);
  });

  it("compares the ticked variations with this item as the baseline", () => {
    renderVariations();
    expect(compareLink()).toHaveAttribute(
      "href",
      "/compare?types=3841,3839,8529,31930,99",
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Compare Large Shield Extender I" }),
    );
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Compare Large Shield Extender II",
      }),
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Compare Unsorted Oddity" }),
    );
    expect(compareLink()).toHaveAttribute("href", "/compare?types=8529,31930");
    expect(compareLink()).toHaveTextContent("Compare 2 selected");
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Compare Large F-S9 Regolith Compact Shield Extender",
      }),
    );
    // One item is not a comparison.
    expect(
      screen.getByRole("link", { name: "Compare 1 selected" }),
    ).toHaveAttribute("data-disabled", "true");
  });

  it("caps the selection at what one comparison holds", () => {
    const many: ItemVariation[] = [
      { typeId: 100, name: "Base", categoryId: 7, metaLevel: 0 },
      ...Array.from({ length: 13 }, (_, i) => ({
        typeId: 101 + i,
        name: `Variant ${String(i).padStart(2, "0")}`,
        categoryId: 7,
        metaLevel: i + 1,
      })),
    ];
    renderVariations(100, many);
    expect(
      screen.getByText(/14 variations · up to 12 can be compared at once/),
    ).toBeInTheDocument();
    expect(compareLink()).toHaveTextContent("Compare 12 selected");
    const unticked = screen.getByRole("checkbox", {
      name: "Compare Variant 12",
    });
    expect(unticked).not.toBeChecked();
    expect(unticked).toBeDisabled();
  });

  it("says when an item has no variations", () => {
    renderVariations(3841, [variations[2]!]);
    expect(
      screen.getByText("This item has no variations."),
    ).toBeInTheDocument();
  });
});
