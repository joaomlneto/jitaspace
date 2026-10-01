import "@testing-library/jest-dom/jest-globals";

import type { ReactElement } from "react";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import type {
  CompareCatalog,
  CompareCell,
  CompareItemInput,
  CompareRow,
} from "~/components/Compare";
import type * as CompareModule from "~/components/Compare";
import type * as CompareItemHeaderModule from "~/components/Compare/CompareItemHeader";
import type * as CompareItemPickerModule from "~/components/Compare/CompareItemPicker";
import type * as CompareValueModule from "~/components/Compare/CompareValue";

jest.mock("~/components/Text", () => ({
  GroupName: ({ groupId }: { groupId?: number }) => (
    <span data-testid="group-name">{`group-${groupId}`}</span>
  ),
}));

// jest.mock is not hoisted in this app's jest setup, so the modules under test
// are required after the mocks above are registered.
const {
  buildComparison,
  CompareEmptyState,
  CompareItemPicker,
  CompareTable,
  CompareToolbar,
  COMPARE_PRESETS,
  indexCompareCatalog,
  useCompareCatalog,
} = require("~/components/Compare") as typeof CompareModule;
const { CompareItemHeader } =
  require("~/components/Compare/CompareItemHeader") as typeof CompareItemHeaderModule;
const { CompareValue, formatDelta } =
  require("~/components/Compare/CompareValue") as typeof CompareValueModule;
const { ComparePickerPortalContext } =
  require("~/components/Compare/CompareItemPicker") as typeof CompareItemPickerModule;

// Mantine's combobox scrolls the highlighted option into view; jsdom has no
// layout, so give it a no-op.
Element.prototype.scrollIntoView = () => undefined;

const renderUi = (ui: ReactElement) =>
  render(<MantineProvider env="test">{ui}</MantineProvider>);

const rawCatalog: CompareCatalog = {
  types: [
    [587, "Rifter", 25, 1],
    [585, "Slasher", 25, 1],
    [598, "Breacher", 25, 1],
    [11184, "Crusader", 831, 2],
  ],
  groups: {
    25: { name: "Frigate", categoryId: 6 },
    831: { name: "Interceptor", categoryId: 6 },
  },
  attributes: {
    37: {
      name: "maxVelocity",
      displayName: "Maximum Velocity",
      categoryId: 17,
      unitId: 11,
      iconId: 1389,
      highIsGood: true,
      published: true,
    },
    263: {
      name: "shieldCapacity",
      displayName: "Shield Capacity",
      categoryId: 2,
      unitId: 113,
      highIsGood: true,
      published: true,
    },
  },
  unitSymbols: { 11: "m/sec", 113: "HP" },
  attributeCategories: { 2: "Shield", 17: "Speed and Travel" },
  metaGroups: { 1: "Tech I", 2: "Tech II" },
};
const catalog = indexCompareCatalog(rawCatalog);

const items: CompareItemInput[] = [
  {
    typeId: 587,
    type: {
      dogma_attributes: [
        { attribute_id: 37, value: 365 },
        { attribute_id: 263, value: 450 },
      ],
    },
    market: { buy: 1000, sell: 2000 },
  },
  {
    typeId: 585,
    type: {
      dogma_attributes: [
        { attribute_id: 37, value: 430 },
        { attribute_id: 263, value: 350 },
      ],
    },
    market: { buy: 1500, sell: 2500 },
  },
];

const comparison = buildComparison(items, rawCatalog, {
  onlyDifferences: false,
  showHidden: false,
  filter: "",
});

describe("CompareTable", () => {
  const names = { 587: "Rifter", 585: "Slasher" };
  const tableProps = (
    overrides: Partial<Parameters<typeof CompareTable>[0]> = {},
  ) => ({
    typeIds: [587, 585],
    names,
    catalog,
    comparison,
    groupIds: {},
    addColumn: <input aria-label="Add an item to compare" />,
    ...overrides,
    // After the overrides, so the mocks keep their jest.fn type.
    onRemove: jest.fn<(typeId: number) => void>(),
    onMove: jest.fn<(typeId: number, index: number) => void>(),
  });
  const renderTable = (
    overrides: Partial<Parameters<typeof CompareTable>[0]> = {},
  ) => {
    const props = tableProps(overrides);
    const view = renderUi(<CompareTable {...props} />);
    return { ...props, view };
  };

  it("renders a column per item, a section per category and the add column", () => {
    renderTable();
    expect(screen.getByText("Rifter")).toBeInTheDocument();
    expect(screen.getByText("Slasher")).toBeInTheDocument();
    expect(screen.getByText("Speed and Travel")).toBeInTheDocument();
    expect(screen.getByText("430 m/sec")).toBeInTheDocument();
    expect(screen.getByText(/^\+18%/)).toBeInTheDocument();
    expect(screen.getByLabelText("Add an item to compare")).toBeInTheDocument();
    expect(screen.getByText("Baseline")).toBeInTheDocument();
  });

  it("names the table and heads every row with its attribute", () => {
    renderTable();
    expect(
      screen.getByRole("table", { name: "Comparison of Rifter, Slasher" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("rowheader", { name: /Maximum Velocity/ }),
    ).toBeInTheDocument();
    // The scrollable region is reachable from the keyboard.
    expect(
      screen.getByRole("region", { name: "Comparison table" }),
    ).toHaveAttribute("tabindex", "0");
  });

  it("collapses and expands a section", () => {
    renderTable();
    const toggle = screen.getByRole("button", { name: /Speed and Travel/ });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);
    expect(screen.queryByText("Maximum Velocity")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Speed and Travel/ }));
    expect(screen.getByText("Maximum Velocity")).toBeInTheDocument();
  });

  it("says how many of a section's rows are shown", () => {
    const filtered = buildComparison(items, rawCatalog, {
      onlyDifferences: false,
      showHidden: false,
      filter: "jita sell",
    });
    renderTable({ comparison: filtered });
    expect(
      screen.getByRole("button", { name: "Market (Jita), 1 of 2 rows" }),
    ).toHaveTextContent("1 of 2");
  });

  it("names the item on every column button", () => {
    renderTable();
    for (const name of ["Rifter", "Slasher"]) {
      expect(
        screen.getByRole("button", { name: `Remove ${name}` }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: `Reorder ${name}` }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: `Actions for ${name}` }),
      ).toBeInTheDocument();
    }
  });

  it("removes a column and moves focus to the next one", () => {
    const props = tableProps({ typeIds: [587, 585, 598] });
    const { rerender } = renderUi(<CompareTable {...props} />);
    const remove = screen.getByRole("button", { name: "Remove Rifter" });
    remove.focus();
    fireEvent.click(remove);
    expect(props.onRemove).toHaveBeenCalledWith(587);
    rerender(
      <MantineProvider env="test">
        <CompareTable {...props} typeIds={[585, 598]} />
      </MantineProvider>,
    );
    expect(document.activeElement).toHaveAttribute(
      "data-compare-remove",
      "585",
    );
  });

  it("falls back to the add box once the last column is removed", () => {
    const props = tableProps({ typeIds: [587] });
    const { rerender } = renderUi(<CompareTable {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove Rifter" }));
    rerender(
      <MantineProvider env="test">
        <CompareTable {...props} typeIds={[]} />
      </MantineProvider>,
    );
    expect(document.activeElement).toHaveAttribute(
      "aria-label",
      "Add an item to compare",
    );
  });

  it("moves columns with the arrow keys and keeps focus on the grip", () => {
    const props = tableProps();
    const { rerender } = renderUi(<CompareTable {...props} />);
    const grip = screen.getByRole("button", { name: "Reorder Rifter" });
    grip.focus();
    fireEvent.keyDown(grip, { key: "ArrowRight" });
    expect(props.onMove).toHaveBeenLastCalledWith(587, 1);
    rerender(
      <MantineProvider env="test">
        <CompareTable {...props} typeIds={[585, 587]} />
      </MantineProvider>,
    );
    expect(document.activeElement).toHaveAttribute("data-compare-grip", "587");

    props.onMove.mockClear();
    // Already at an edge, or a key that is not an arrow: nothing moves.
    fireEvent.keyDown(screen.getByRole("button", { name: "Reorder Rifter" }), {
      key: "ArrowRight",
    });
    fireEvent.keyDown(screen.getByRole("button", { name: "Reorder Slasher" }), {
      key: "ArrowLeft",
    });
    fireEvent.keyDown(screen.getByRole("button", { name: "Reorder Slasher" }), {
      key: "Enter",
    });
    expect(props.onMove).not.toHaveBeenCalled();
  });

  it("moves columns from the actions menu", async () => {
    const { onMove, onRemove } = renderTable();
    fireEvent.click(
      screen.getByRole("button", { name: "Actions for Slasher" }),
    );
    expect(
      await screen.findByRole("menuitem", { name: "Move right" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("menuitem", { name: "Move left" }));
    expect(onMove).toHaveBeenLastCalledWith(585, 0);

    fireEvent.click(screen.getByRole("button", { name: "Actions for Rifter" }));
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Move right" }),
    );
    expect(onMove).toHaveBeenLastCalledWith(587, 1);

    fireEvent.click(
      screen.getByRole("button", { name: "Actions for Slasher" }),
    );
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Set as baseline" }),
    );
    expect(onMove).toHaveBeenLastCalledWith(585, 0);

    fireEvent.click(screen.getByRole("button", { name: "Actions for Rifter" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Remove" }));
    expect(onRemove).toHaveBeenCalledWith(587);
  });

  it("moves a column dropped onto another", () => {
    const { onMove } = renderTable();
    const store = new Map<string, string>();
    const dataTransfer = {
      get types() {
        return [...store.keys()];
      },
      setData: (type: string, value: string) => store.set(type, value),
      getData: (type: string) => store.get(type) ?? "",
      effectAllowed: "none",
    };
    fireEvent.dragStart(
      screen.getByRole("button", { name: "Reorder Slasher" }),
      {
        dataTransfer,
      },
    );
    const target = screen
      .getByRole("button", { name: "Reorder Rifter" })
      .closest("th")!;
    fireEvent.dragOver(target, { dataTransfer });
    fireEvent.dragLeave(target, { dataTransfer });
    fireEvent.drop(target, { dataTransfer });
    expect(onMove).toHaveBeenCalledWith(585, 0);
  });

  it("ignores a drag that is not a column", () => {
    const { onMove } = renderTable();
    const dataTransfer = { types: ["text/plain"], getData: () => "" };
    const target = screen
      .getByRole("button", { name: "Reorder Rifter" })
      .closest("th")!;
    fireEvent.dragOver(target, { dataTransfer });
    fireEvent.drop(target, { dataTransfer });
    expect(onMove).not.toHaveBeenCalled();
  });

  it("offers no reordering for a single item", () => {
    renderTable({
      typeIds: [587],
      comparison: buildComparison([items[0]!], rawCatalog, {
        onlyDifferences: false,
        showHidden: false,
        filter: "",
      }),
    });
    expect(
      screen.queryByRole("button", { name: "Reorder Rifter" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Baseline")).not.toBeInTheDocument();
  });

  it("renders a fixed, read-only table without actions or add column", () => {
    renderUi(
      <CompareTable
        typeIds={[587, 585]}
        names={names}
        catalog={catalog}
        comparison={comparison}
        groupIds={{}}
        maxHeight={300}
      />,
    );
    expect(screen.getByText("Rifter")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Remove / })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Reorder / })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Actions for / })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add item" })).toBeNull();
    expect(
      screen.getByRole("region", { name: "Comparison table" }),
    ).toHaveStyle({ maxHeight: "300px" });
    // Dropping a column onto another does nothing without onMove.
    const dataTransfer = {
      types: ["application/x-jitaspace-compare-type"],
      getData: () => "585",
    };
    const target = screen.getAllByRole("columnheader")[1]!;
    fireEvent.drop(target, { dataTransfer });
  });

  it("keeps a section that appears later expanded after another is collapsed", () => {
    const filtered = buildComparison(items, rawCatalog, {
      onlyDifferences: false,
      showHidden: false,
      filter: "velocity",
    });
    const { view } = renderTable({ comparison: filtered });
    fireEvent.click(screen.getByRole("button", { name: /Speed and Travel/ }));
    view.rerender(
      <MantineProvider env="test">
        <CompareTable {...tableProps()} />
      </MantineProvider>,
    );
    const toggles = screen.getAllByRole("button", { expanded: true });
    expect(toggles.length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: /Speed and Travel/ }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Maximum Velocity")).not.toBeInTheDocument();
  });

  describe("when the columns fill the width", () => {
    const originalResizeObserver = global.ResizeObserver;
    afterEach(() => {
      global.ResizeObserver = originalResizeObserver;
    });

    it("folds the add column into a button in the corner", async () => {
      global.ResizeObserver = class {
        constructor(
          private readonly callback: (
            entries: { contentRect: { width: number } }[],
          ) => void,
        ) {}
        observe() {
          this.callback([{ contentRect: { width: 320 } }]);
        }
        disconnect() {
          return undefined;
        }
      } as unknown as typeof ResizeObserver;
      renderTable();
      const add = screen.getByRole("button", { name: "Add item" });
      expect(
        screen.queryByLabelText("Add an item to compare"),
      ).not.toBeInTheDocument();
      fireEvent.click(add);
      expect(
        await screen.findByLabelText("Add an item to compare"),
      ).toBeInTheDocument();
    });
  });
});

describe("CompareItemHeader", () => {
  const headerProps = {
    name: "Item",
    index: 0,
    count: 1,
    onMove: () => undefined,
    onRemove: () => undefined,
  };

  it("falls back to ESI names and groups for items outside the catalog", () => {
    renderUi(
      <CompareItemHeader
        {...headerProps}
        typeId={34}
        catalog={catalog}
        fallbackGroupId={18}
      />,
    );
    expect(screen.getByTestId("type-name")).toHaveTextContent("type-34");
    expect(screen.getByTestId("group-name")).toHaveTextContent("group-18");
  });

  it("shows a placeholder until the group is known", () => {
    const { container } = renderUi(
      <CompareItemHeader {...headerProps} typeId={34} />,
    );
    expect(
      container.querySelector(".mantine-Skeleton-root"),
    ).toBeInTheDocument();
  });

  it("shows the meta group of a catalog item", () => {
    renderUi(
      <CompareItemHeader
        {...headerProps}
        typeId={11184}
        catalog={catalog}
        index={1}
        count={2}
      />,
    );
    expect(screen.getByText("Tech II")).toBeInTheDocument();
    expect(screen.getByText("Interceptor")).toBeInTheDocument();
  });
});

describe("CompareValue", () => {
  const row = (overrides: Partial<CompareRow> = {}): CompareRow => ({
    key: "row",
    kind: "attribute",
    label: "Row",
    cells: [],
    differs: true,
    hidden: false,
    ...overrides,
  });
  const renderValue = (r: CompareRow, cell: CompareCell) =>
    renderUi(
      <CompareValue row={r} cell={cell} attributes={rawCatalog.attributes} />,
    );

  it("shows a placeholder while loading and a dash for no value", () => {
    const { container } = renderValue(row(), { loading: true });
    expect(
      container.querySelector(".mantine-Skeleton-root"),
    ).toBeInTheDocument();
    renderValue(row(), {});
    expect(screen.getByText("—")).toHaveAttribute("aria-hidden");
    expect(screen.getByText("Not applicable")).toBeInTheDocument();
  });

  it("formats with the unit, marks the rank and says how the delta compares", () => {
    renderValue(row({ unitId: 113, unitSymbol: "HP" }), {
      value: 350,
      rank: "worst",
      delta: -0.2222,
      deltaIsBetter: false,
    });
    expect(screen.getByText("350 HP")).toBeInTheDocument();
    expect(screen.getByText("(worst)")).toBeInTheDocument();
    expect(screen.getByText(/^-22%/)).toHaveTextContent(
      "-22% worse than the first column",
    );
  });

  it("says when a delta is better", () => {
    renderValue(row({ unitId: 113, unitSymbol: "HP" }), {
      value: 500,
      rank: "best",
      delta: 0.11,
      deltaIsBetter: true,
    });
    expect(screen.getByText("(best)")).toBeInTheDocument();
    expect(screen.getByText(/^\+11%/)).toHaveTextContent(
      "+11% better than the first column",
    );
  });

  it("marks a default value in italics and in words", () => {
    renderValue(row({ unitSymbol: "m3" }), { value: 0, isDefault: true });
    expect(
      screen.getByTitle("Default value: not set on this item"),
    ).toHaveTextContent("0 m³ (default, not set on this item)");
    expect(screen.getByText("0 m³")).toHaveStyle({ fontStyle: "italic" });
  });

  it("renders prices as ISK", () => {
    renderValue(row({ isk: true }), { value: 2000, delta: 0.25 });
    expect(screen.getByTestId("isk-amount")).toHaveTextContent("2,000");
    expect(screen.getByText("+25%")).toBeInTheDocument();
  });

  it("links id-valued attributes to what they name", () => {
    renderValue(row({ unitId: 116 }), { value: 3329, level: 3 });
    expect(screen.getByTestId("type-anchor")).toHaveAttribute(
      "href",
      "/type/3329",
    );
    expect(screen.getByText("III")).toBeInTheDocument();

    renderValue(row({ unitId: 115 }), { value: 25 });
    expect(screen.getByTestId("group-name")).toHaveTextContent("group-25");

    renderValue(row({ unitId: 119 }), { value: 37 });
    expect(screen.getByText("Maximum Velocity")).toHaveAttribute(
      "href",
      "/dogma/attribute/37",
    );
    renderValue(row({ unitId: 119 }), { value: 5 });
    expect(screen.getByText("5")).toHaveAttribute("href", "/dogma/attribute/5");
  });

  it.each([
    [0.19, "+19%"],
    [-0.045, "-4.5%"],
    [0.0004, "+<0.1%"],
    [-0.0004, "-<0.1%"],
    [0, "0%"],
    [1.5, "+150%"],
  ])("formats a delta of %p as %s", (delta, expected) => {
    expect(formatDelta(delta)).toBe(expected);
  });
});

describe("CompareItemPicker", () => {
  it("searches the catalog and adds the picked item", async () => {
    const onAdd = jest.fn();
    renderUi(
      <CompareItemPicker
        catalog={catalog}
        isLoading={false}
        selectedTypeIds={[587]}
        onAdd={onAdd}
      />,
    );
    const input = screen.getByLabelText("Add an item to compare");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "sla" } });
    const option = await screen.findByText("Slasher");
    expect(screen.getAllByText("Frigate")).not.toHaveLength(0);
    fireEvent.click(option);
    expect(onAdd).toHaveBeenCalledWith(585, "search");
    expect(input).toHaveValue("");
  });

  it("can take focus when it mounts", () => {
    renderUi(
      <CompareItemPicker
        catalog={catalog}
        isLoading={false}
        selectedTypeIds={[]}
        onAdd={jest.fn()}
        autoFocus
      />,
    );
    expect(screen.getByLabelText("Add an item to compare")).toHaveFocus();
  });

  it("renders its results in place inside a popover", async () => {
    const { container } = renderUi(
      <ComparePickerPortalContext value={false}>
        <CompareItemPicker
          catalog={catalog}
          isLoading={false}
          selectedTypeIds={[]}
          onAdd={jest.fn()}
        />
      </ComparePickerPortalContext>,
    );
    const input = screen.getByLabelText("Add an item to compare");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "sla" } });
    expect(container).toContainElement(await screen.findByText("Slasher"));
  });

  it("explains an empty result", async () => {
    const { rerender } = renderUi(
      <CompareItemPicker
        catalog={catalog}
        isLoading={false}
        selectedTypeIds={[]}
        onAdd={() => undefined}
      />,
    );
    const input = screen.getByLabelText("Add an item to compare");
    fireEvent.change(input, { target: { value: "x" } });
    expect(
      await screen.findByText("Type at least two letters"),
    ).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "zzzz" } });
    expect(await screen.findByText("No matching items")).toBeInTheDocument();

    rerender(
      <MantineProvider env="test">
        <CompareItemPicker
          isLoading
          selectedTypeIds={[]}
          onAdd={() => undefined}
        />
      </MantineProvider>,
    );
    expect(await screen.findByText("Loading items…")).toBeInTheDocument();

    rerender(
      <MantineProvider env="test">
        <CompareItemPicker
          isLoading={false}
          selectedTypeIds={[]}
          onAdd={() => undefined}
        />
      </MantineProvider>,
    );
    expect(
      await screen.findByText("Item search is unavailable right now"),
    ).toBeInTheDocument();
    fireEvent.blur(input);
  });
});

describe("CompareItemPicker suggestions", () => {
  it("offers suggestions in the empty box and says where a pick came from", async () => {
    const onAdd = jest.fn();
    renderUi(
      <CompareItemPicker
        catalog={catalog}
        isLoading={false}
        selectedTypeIds={[587, 585]}
        onAdd={onAdd}
        suggestions={[catalog.typesById.get(598)!]}
        suggestionsLabel="More from Frigate"
      />,
    );
    const input = screen.getByLabelText("Add an item to compare");
    fireEvent.focus(input);
    expect(await screen.findByText("More from Frigate")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Breacher"));
    expect(onAdd).toHaveBeenCalledWith(598, "suggestion");

    // Typing replaces the suggestions with search results.
    fireEvent.change(input, { target: { value: "cru" } });
    fireEvent.click(await screen.findByText("Crusader"));
    expect(onAdd).toHaveBeenLastCalledWith(11184, "search");
  });
});

describe("CompareToolbar", () => {
  it("drives the view options and reports the row counts", () => {
    const onOnlyDifferencesChange = jest.fn();
    const onShowHiddenChange = jest.fn();
    const onFilterChange = jest.fn();
    renderUi(
      <CompareToolbar
        itemCount={2}
        onlyDifferences
        onOnlyDifferencesChange={onOnlyDifferencesChange}
        showHidden={false}
        onShowHiddenChange={onShowHiddenChange}
        filter="shield"
        onFilterChange={onFilterChange}
        comparison={{
          sections: [],
          totalRows: 10,
          shownRows: 4,
          identicalRows: 6,
        }}
      />,
    );
    expect(
      screen.getByText(/4 of 10 rows \(6 identical hidden\)/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText("All attributes"));
    expect(onOnlyDifferencesChange).toHaveBeenCalledWith(false);
    fireEvent.click(screen.getByLabelText("Hidden attributes"));
    expect(onShowHiddenChange).toHaveBeenCalledWith(true);
    fireEvent.change(screen.getByLabelText("Filter attributes"), {
      target: { value: "armor" },
    });
    expect(onFilterChange).toHaveBeenCalledWith("armor");
    fireEvent.click(screen.getByLabelText("Clear filter"));
    expect(onFilterChange).toHaveBeenLastCalledWith("");
  });
});

describe("CompareEmptyState", () => {
  it("links every preset to its comparison", () => {
    const onPresetClick = jest.fn();
    renderUi(<CompareEmptyState onPresetClick={onPresetClick} />);
    const preset = COMPARE_PRESETS[0]!;
    const card = screen.getByText(preset.label).closest("a")!;
    expect(card).toHaveAttribute(
      "href",
      `/compare?types=${preset.typeIds.join(",")}`,
    );
    fireEvent.click(card);
    expect(onPresetClick).toHaveBeenCalledWith(preset);
    expect(within(card).getAllByTestId("type-avatar")).toHaveLength(
      preset.typeIds.length,
    );
  });
});

describe("useCompareCatalog", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      {children}
    </QueryClientProvider>
  );

  it("fetches and indexes the catalog", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(rawCatalog) }),
    ) as unknown as typeof fetch;
    const { result } = renderHook(() => useCompareCatalog(), { wrapper });
    await waitFor(() => expect(result.current.catalog).toBeDefined());
    expect(result.current.catalog?.typesById.get(587)?.name).toBe("Rifter");
    expect(global.fetch).toHaveBeenCalledWith("/api/compare/catalog");
  });

  it("reports a failed request", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 500 }),
    ) as unknown as typeof fetch;
    const { result } = renderHook(() => useCompareCatalog(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    await act(async () => {
      await result.current.refetch();
    });
    expect(result.current.catalog).toBeUndefined();
  });
});
