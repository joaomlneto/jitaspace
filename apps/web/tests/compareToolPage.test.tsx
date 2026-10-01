import "@testing-library/jest-dom/jest-globals";

import type { OnUrlUpdateFunction } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";

import type * as PageModule from "~/app/compare/page";
import type * as ItemComparisonModule from "~/components/Compare/ItemComparison";
import { captureMock } from "../__mocks__/posthogMocks";

// The page wires URL state, data hooks and the Compare components together;
// the components have their own tests, so here they are stubs that expose the
// callbacks the page hands them.
const mockUseTypes = jest.fn<(ids: number[]) => unknown>();
const mockUseMarket = jest.fn<(ids: number[], regionId: number) => unknown>();
jest.mock("@jitaspace/hooks", () => ({
  useTypes: (ids: number[]) => mockUseTypes(ids),
  useFuzzworkRegionalMarketAggregates: (ids: number[], regionId: number) =>
    mockUseMarket(ids, regionId),
}));

jest.mock("@jitaspace/eve-icons", () => ({
  CompareToolIcon: () => <span data-testid="compare-icon" />,
}));

const mockUseCompareCatalog = jest.fn<() => unknown>();
const mockBuildComparison = jest.fn<(...args: unknown[]) => unknown>();
const mockRefetch = jest.fn();

// ItemComparison is real; the modules it composes are stubs that expose the
// callbacks it hands them (they have their own tests).
jest.mock("~/components/Compare/useCompareCatalog", () => ({
  useCompareCatalog: () => mockUseCompareCatalog(),
}));
jest.mock("~/components/Compare/comparison", () => ({
  buildComparison: (...args: unknown[]) => mockBuildComparison(...args),
}));
jest.mock("~/components/Compare/search", () => ({
  suggestSameGroupTypes: () => [],
}));
jest.mock("~/components/Compare/CompareItemPicker", () => ({
  CompareItemPicker: ({
    onAdd,
  }: {
    onAdd: (typeId: number, source: "search" | "suggestion") => void;
  }) => (
    <div>
      <button data-testid="picker-add" onClick={() => onAdd(34, "search")}>
        add 34
      </button>
      <button
        data-testid="suggestion-add"
        onClick={() => onAdd(36, "suggestion")}
      >
        add 36
      </button>
    </div>
  ),
}));
jest.mock("~/components/Compare/CompareToolbar", () => ({
  CompareToolbar: ({ onClear }: { onClear?: () => void }) => (
    <div data-testid="toolbar">
      {onClear && <button onClick={onClear}>Clear all</button>}
    </div>
  ),
}));
jest.mock("~/components/Compare/CompareEmptyState", () => ({
  CompareEmptyState: ({
    onPresetClick,
  }: {
    onPresetClick: (preset: { typeIds: number[] }) => void;
  }) => (
    <button
      data-testid="preset"
      onClick={() => onPresetClick({ typeIds: [587, 585] })}
    >
      preset
    </button>
  ),
}));
jest.mock("~/components/Compare/CompareTable", () => ({
  CompareTable: ({
    typeIds,
    names,
    onRemove,
    onMove,
    addColumn,
    maxHeight,
  }: {
    typeIds: number[];
    names: Record<number, string>;
    onRemove?: (typeId: number) => void;
    onMove?: (typeId: number, index: number) => void;
    addColumn?: ReactNode;
    maxHeight?: string;
  }) => (
    <div>
      <div data-testid="compare-table">{`types:${typeIds.join(",")}`}</div>
      <div data-testid="names">
        {typeIds.map((typeId) => names[typeId]).join("|")}
      </div>
      <div data-testid="table-options">
        {`editable:${onRemove && onMove ? "yes" : "no"} add:${addColumn ? "yes" : "no"} maxHeight:${maxHeight ?? "-"}`}
      </div>
      {onMove && (
        <>
          <button
            data-testid="move-first-last"
            onClick={() => onMove(typeIds[0]!, 1)}
          >
            move right
          </button>
          <button
            data-testid="move-last-first"
            onClick={() => onMove(typeIds.at(-1)!, 0)}
          >
            move
          </button>
        </>
      )}
      {onRemove && (
        <button
          data-testid="remove-first"
          onClick={() => onRemove(typeIds[0]!)}
        >
          remove
        </button>
      )}
      {addColumn}
    </div>
  ),
}));

const { default: Page } = require("~/app/compare/page") as typeof PageModule;
const {
  ItemComparison,
  itemCount,
  moveTypeId,
  normalizeTypeIds,
  MAX_COMPARE_ITEMS,
} =
  require("~/components/Compare/ItemComparison") as typeof ItemComparisonModule;

function renderPage(
  adapter: { searchParams?: string; onUrlUpdate?: OnUrlUpdateFunction } = {},
) {
  return render(
    <MantineProvider env="test">
      <Page />
    </MantineProvider>,
    { wrapper: withNuqsTestingAdapter({ hasMemory: true, ...adapter }) },
  );
}

beforeEach(() => {
  captureMock.mockClear();
  mockRefetch.mockClear();
  mockUseTypes.mockReturnValue({ data: {} });
  mockUseMarket.mockReturnValue({ data: null, isError: false });
  mockUseCompareCatalog.mockReturnValue({
    catalog: { attributes: {}, typesById: new Map() },
    isLoading: false,
    isError: false,
    refetch: mockRefetch,
  });
  mockBuildComparison.mockReturnValue({
    sections: [],
    totalRows: 3,
    shownRows: 3,
    identicalRows: 0,
  });
});

describe("Compare tool page", () => {
  it("starts empty, with the search and the presets", () => {
    renderPage();
    expect(screen.getByTestId("compare-icon")).toBeInTheDocument();
    expect(screen.getByTestId("preset")).toBeInTheDocument();
    expect(screen.queryByTestId("compare-table")).not.toBeInTheDocument();
  });

  it("adds a searched item and records where it came from", async () => {
    const onUrlUpdate = jest.fn<OnUrlUpdateFunction>();
    renderPage({ onUrlUpdate });
    fireEvent.click(screen.getByTestId("picker-add"));
    expect(screen.getByTestId("compare-table")).toHaveTextContent("types:34");
    expect(captureMock).toHaveBeenCalledWith("compare_items_added", {
      type_ids: [34],
      item_count: 1,
      source: "search",
    });
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    expect(onUrlUpdate.mock.calls.at(-1)![0].queryString).toBe("?types=34");
  });

  it("adds from the table's add column and its suggestions", () => {
    renderPage({ searchParams: "?types=35" });
    fireEvent.click(screen.getByTestId("suggestion-add"));
    expect(screen.getByTestId("compare-table")).toHaveTextContent(
      "types:35,36",
    );
    expect(captureMock).toHaveBeenLastCalledWith("compare_items_added", {
      type_ids: [35, 36],
      item_count: 2,
      source: "suggestion",
    });
  });

  it("does not record adding an item already compared", () => {
    renderPage({ searchParams: "?types=34" });
    fireEvent.click(screen.getByTestId("picker-add"));
    expect(captureMock).not.toHaveBeenCalled();
  });

  it("records a preset", () => {
    renderPage();
    fireEvent.click(screen.getByTestId("preset"));
    expect(captureMock).toHaveBeenCalledWith("compare_items_added", {
      type_ids: [587, 585],
      item_count: 2,
      source: "preset",
    });
  });

  it("removes, reorders and clears items", () => {
    renderPage({ searchParams: "?types=34,35,36" });
    fireEvent.click(screen.getByTestId("move-last-first"));
    expect(screen.getByTestId("compare-table")).toHaveTextContent(
      "types:36,34,35",
    );
    fireEvent.click(screen.getByTestId("remove-first"));
    expect(screen.getByTestId("compare-table")).toHaveTextContent(
      "types:34,35",
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(screen.queryByTestId("compare-table")).not.toBeInTheDocument();
  });

  it("copies the comparison's link", async () => {
    const writeText = jest.fn(() => Promise.resolve());
    Object.assign(navigator, { clipboard: { writeText } });
    renderPage({ searchParams: "?types=34" });
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Link copied" }),
      ).toBeInTheDocument(),
    );
    expect(writeText).toHaveBeenCalled();
  });

  it("feeds each item's type and Jita prices to the comparison", () => {
    mockUseTypes.mockReturnValue({ data: { 34: { group_id: 18 } } });
    mockUseMarket.mockReturnValue({
      data: { 34: { buy: { percentile: 4 }, sell: { percentile: 5 } } },
      isError: false,
    });
    renderPage({ searchParams: "?types=34,35" });
    expect(mockUseMarket).toHaveBeenCalledWith([34, 35], 10000002);
    const [items] = mockBuildComparison.mock.calls.at(-1)!;
    expect(items).toEqual([
      { typeId: 34, type: { group_id: 18 }, market: { buy: 4, sell: 5 } },
      // Loaded, but no orders: a known absence, not a pending load.
      { typeId: 35, type: undefined, market: { buy: 0, sell: 0 } },
    ]);
  });

  it("leaves prices pending while they load", () => {
    renderPage({ searchParams: "?types=34" });
    const [items] = mockBuildComparison.mock.calls.at(-1)!;
    expect(items).toEqual([{ typeId: 34, type: undefined, market: undefined }]);
  });

  it("treats a failed price request as no orders", () => {
    mockUseMarket.mockReturnValue({ data: null, isError: true });
    renderPage({ searchParams: "?types=34" });
    const [items] = mockBuildComparison.mock.calls.at(-1)!;
    expect(items).toEqual([
      { typeId: 34, type: undefined, market: { buy: 0, sell: 0 } },
    ]);
  });

  it("shows a placeholder while the catalog loads", () => {
    mockUseCompareCatalog.mockReturnValue({
      catalog: undefined,
      isLoading: true,
      isError: false,
      refetch: mockRefetch,
    });
    renderPage({ searchParams: "?types=34" });
    expect(screen.queryByTestId("compare-table")).not.toBeInTheDocument();
  });

  it("offers a retry when the catalog fails, and still shows the table", () => {
    mockUseCompareCatalog.mockReturnValue({
      catalog: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    });
    renderPage({ searchParams: "?types=34" });
    expect(screen.getByText("Item data didn't load")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mockRefetch).toHaveBeenCalled();
    expect(screen.getByTestId("compare-table")).toBeInTheDocument();
  });

  it("says so when nothing is left to show", () => {
    mockBuildComparison.mockReturnValue({
      sections: [],
      totalRows: 3,
      shownRows: 0,
      identicalRows: 3,
    });
    renderPage({ searchParams: "?types=34,35" });
    expect(
      screen.getByText("These items are identical in every shown attribute."),
    ).toBeInTheDocument();
  });

  it("nudges towards a second item", () => {
    renderPage({ searchParams: "?types=34" });
    expect(
      screen.getByText("Add another item to see which comes out ahead."),
    ).toBeInTheDocument();
  });
});

describe("Compare tool page URL sync", () => {
  it("restores the compared types from the URL on load", () => {
    renderPage({ searchParams: "?types=34,35" });
    expect(screen.getByTestId("compare-table")).toHaveTextContent(
      "types:34,35",
    );
  });

  // The integer item-parser validates URL input, so a hand-edited id can never
  // reach the type lookups as NaN.
  it("drops unparseable type ids from the URL", () => {
    renderPage({ searchParams: "?types=abc,35" });
    expect(screen.getByTestId("compare-table")).toHaveTextContent("types:35");
  });

  it("drops duplicate and non-positive ids", () => {
    renderPage({ searchParams: "?types=35,-1,35,0,36" });
    expect(screen.getByTestId("compare-table")).toHaveTextContent(
      "types:35,36",
    );
  });
});

describe("Compare tool page announcements", () => {
  const status = () => screen.getByRole("status", { hidden: true });

  it("names items from the catalog, then ESI, then their id", () => {
    mockUseCompareCatalog.mockReturnValue({
      catalog: {
        attributes: {},
        typesById: new Map([[34, { name: "Tritanium" }]]),
      },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });
    mockUseTypes.mockReturnValue({ data: { 35: { name: "Pyerite" } } });
    renderPage({ searchParams: "?types=34,35,36" });
    expect(screen.getByTestId("names")).toHaveTextContent(
      "Tritanium|Pyerite|item 36",
    );
  });

  it("announces adding, removing, moving and clearing", () => {
    mockUseTypes.mockReturnValue({
      data: {
        34: { name: "Rifter" },
        35: { name: "Slasher" },
        36: { name: "Breacher" },
      },
    });
    renderPage({ searchParams: "?types=35" });
    fireEvent.click(screen.getByTestId("suggestion-add"));
    expect(status()).toHaveTextContent("Added Breacher. Comparing 2 items.");
    fireEvent.click(screen.getByTestId("move-last-first"));
    expect(status()).toHaveTextContent("Breacher is now the baseline.");
    fireEvent.click(screen.getByTestId("move-first-last"));
    expect(status()).toHaveTextContent("Breacher moved to column 2 of 2.");
    fireEvent.click(screen.getByTestId("remove-first"));
    expect(status()).toHaveTextContent("Removed Slasher. Comparing 1 item.");
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(status()).toHaveTextContent("Comparison cleared.");
  });
});

describe("itemCount", () => {
  it.each([
    [0, "Nothing left to compare"],
    [1, "Comparing 1 item"],
    [3, "Comparing 3 items"],
  ])("describes %p items", (count, expected) => {
    expect(itemCount(count)).toBe(expected);
  });
});

describe("ItemComparison as a standalone component", () => {
  const renderComparison = (props: Parameters<typeof ItemComparison>[0] = {}) =>
    render(
      <MantineProvider env="test">
        <ItemComparison {...props} />
      </MantineProvider>,
    );

  it("keeps its own selection when uncontrolled", () => {
    const onTypeIdsChange = jest.fn();
    renderComparison({ defaultTypeIds: [35, 36], onTypeIdsChange });
    expect(screen.getByTestId("compare-table")).toHaveTextContent(
      "types:35,36",
    );
    fireEvent.click(screen.getByTestId("picker-add"));
    expect(screen.getByTestId("compare-table")).toHaveTextContent(
      "types:35,36,34",
    );
    expect(onTypeIdsChange).toHaveBeenCalledWith([35, 36, 34]);
  });

  it("reports additions to onItemsAdded", () => {
    const onItemsAdded = jest.fn();
    renderComparison({ defaultTypeIds: [35], onItemsAdded });
    fireEvent.click(screen.getByTestId("suggestion-add"));
    expect(onItemsAdded).toHaveBeenCalledWith({
      typeIds: [35, 36],
      added: [36],
      source: "suggestion",
    });
  });

  it("shows a fixed comparison when not editable", () => {
    renderComparison({ defaultTypeIds: [35, 36], editable: false });
    expect(screen.getByTestId("table-options")).toHaveTextContent(
      "editable:no add:no",
    );
    expect(
      screen.queryByRole("button", { name: "Clear all" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("picker-add")).not.toBeInTheDocument();
  });

  it("says so when a fixed comparison is empty", () => {
    renderComparison({ editable: false, emptyState: <p>custom empty</p> });
    expect(screen.getByText("Nothing to compare.")).toBeInTheDocument();
    expect(screen.getByText("custom empty")).toBeInTheDocument();
  });

  it("can drop the toolbar and cap the table's height", () => {
    renderComparison({
      defaultTypeIds: [35],
      withToolbar: false,
      maxHeight: "400px",
    });
    expect(screen.queryByTestId("toolbar")).not.toBeInTheDocument();
    expect(screen.getByTestId("table-options")).toHaveTextContent(
      "maxHeight:400px",
    );
  });

  it("honours a smaller item limit", () => {
    renderComparison({ defaultTypeIds: [35, 36, 37], maxItems: 2 });
    expect(screen.getByTestId("compare-table")).toHaveTextContent(
      "types:35,36",
    );
    fireEvent.click(screen.getByTestId("picker-add"));
    expect(screen.getByTestId("compare-table")).toHaveTextContent(
      "types:35,36",
    );
  });

  it("starts from the view options it is given", () => {
    renderComparison({
      defaultTypeIds: [35, 36],
      defaultOnlyDifferences: false,
      defaultShowHidden: true,
    });
    const [, , options] = mockBuildComparison.mock.calls.at(-1)!;
    expect(options).toEqual({
      onlyDifferences: false,
      showHidden: true,
      filter: "",
    });
  });
});

describe("normalizeTypeIds", () => {
  it("caps a comparison at the maximum", () => {
    const many = Array.from({ length: MAX_COMPARE_ITEMS + 3 }, (_, i) => i + 1);
    expect(normalizeTypeIds(many)).toHaveLength(MAX_COMPARE_ITEMS);
  });
});

describe("moveTypeId", () => {
  it.each([
    [[1, 2, 3], 3, 0, [3, 1, 2]],
    [[1, 2, 3], 1, 2, [2, 3, 1]],
    [[1, 2, 3], 2, 9, [1, 3, 2]],
    [[1, 2, 3], 2, -4, [2, 1, 3]],
    [[1, 2, 3], 7, 0, [1, 2, 3]],
  ])("moves in %p id %p to %p", (typeIds, typeId, index, expected) => {
    expect(moveTypeId(typeIds, typeId, index)).toEqual(expected);
  });
});
