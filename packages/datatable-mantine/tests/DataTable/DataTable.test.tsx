import "@testing-library/jest-dom/jest-globals";

import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { DataTableColumn } from "@jitaspace/datatable";

import { DataTable } from "../../DataTable/MantineDataTable";

// mantine-datatable gates every header/row cell behind its `visibleMediaQuery`
// feature: each cell calls `useMediaQuery(query || "", true)` and renders
// `null` while the query does not match. For columns without a media query the
// query string is "" ("no constraint" → always visible). The shared jest.setup
// matchMedia stub answers `matches: false` for *every* query, which makes those
// cells disappear after the mount effect — leaving empty <tr>s with no <th>/<td>.
// Treat the empty/no-constraint query as matching so cells render under jsdom.
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      // A falsy/empty query means "always visible"; anything else is unmatched.
      matches: !query,
      media: query,
      onchange: null,
      addListener: () => {
        /* deprecated no-op */
      },
      removeListener: () => {
        /* deprecated no-op */
      },
      addEventListener: () => {
        /* no-op */
      },
      removeEventListener: () => {
        /* no-op */
      },
      dispatchEvent: () => false,
    }),
  });
});

interface Row {
  id: number;
  name: string;
  score: number;
}

const columns: DataTableColumn<Row>[] = [
  { id: "name", header: "Name", accessor: "name", sortable: true },
  { id: "score", header: "Score", accessor: "score", sortable: true },
];

const data: Row[] = [
  { id: 1, name: "Charlie", score: 82 },
  { id: 2, name: "Alice", score: 90 },
  { id: 3, name: "Bob", score: 75 },
];

const renderWithMantine = (ui: React.ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

/**
 * The text of each rendered header cell.
 *
 * NOTE: mantine-datatable gives *sortable* header cells `role="button"` (not
 * `role="columnheader"`), so we read the `<thead>` `<th>` elements directly
 * rather than querying by the columnheader role. Each header also contains a
 * visually-hidden sort-state label ("Not sorted" / "Sorted ascending"), so we
 * match on substring rather than exact equality.
 */
const headerTexts = (): string[] =>
  Array.from(document.querySelectorAll("thead th")).map(
    // `textContent` on an element node is always a string (never null here).
    (th) => th.textContent,
  );

const hasHeader = (label: string): boolean =>
  headerTexts().some((text) => text.includes(label));

/**
 * Returns the visible data rows (excludes the header row, and any empty-state /
 * loader rows that mantine-datatable injects into the <tbody>).
 */
const dataRows = (): HTMLElement[] =>
  screen
    .getAllByRole("row")
    // The header row contains the column headers; skip rows that have <th>s.
    .filter((row) => within(row).queryAllByRole("columnheader").length === 0)
    .filter((row) => row.querySelectorAll("td").length > 0)
    // Only rows that actually contain a known data value.
    .filter((row) => /Alice|Bob|Charlie|Row \d+/.test(row.textContent));

const nameOrder = (): string[] =>
  dataRows().map((row) => /Alice|Bob|Charlie/.exec(row.textContent)![0]);

describe("DataTable — basic rendering", () => {
  it("renders all column headers by their header text", () => {
    renderWithMantine(<DataTable columns={columns} data={data} />);
    expect(hasHeader("Name")).toBe(true);
    expect(hasHeader("Score")).toBe(true);
  });

  it("renders every row's cell values", () => {
    renderWithMantine(<DataTable columns={columns} data={data} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
    expect(screen.getByText("90")).toBeInTheDocument();
    expect(screen.getByText("75")).toBeInTheDocument();
    expect(screen.getByText("82")).toBeInTheDocument();
  });

  it("renders custom cell content", () => {
    const cellColumns: DataTableColumn<Row>[] = [
      {
        id: "name",
        header: "Name",
        accessor: "name",
        cell: (row) => `★ ${row.name}`,
      },
    ];
    renderWithMantine(<DataTable columns={cellColumns} data={data} />);
    expect(screen.getByText("★ Alice")).toBeInTheDocument();
  });

  it("supports display-only columns with no accessor (rendered via cell)", () => {
    const displayColumns: DataTableColumn<Row>[] = [
      { id: "name", header: "Name", accessor: "name" },
      // No accessor: the cell renders straight from the row; the accessed
      // value passed to `cell` is undefined.
      {
        id: "actions",
        header: "Actions",
        cell: (row, value) => `edit:${row.id}:${String(value)}`,
      },
    ];
    renderWithMantine(<DataTable columns={displayColumns} data={data} />);
    expect(hasHeader("Actions")).toBe(true);
    expect(screen.getByText("edit:2:undefined")).toBeInTheDocument();
  });
});

describe("DataTable — empty state", () => {
  it("shows the default empty text when there are no rows", () => {
    renderWithMantine(<DataTable columns={columns} data={[]} />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("shows a custom emptyText when there are no rows", () => {
    renderWithMantine(
      <DataTable columns={columns} data={[]} emptyText="Nothing here" />,
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("does not render any data rows when empty", () => {
    renderWithMantine(<DataTable columns={columns} data={[]} />);
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    expect(dataRows()).toHaveLength(0);
  });
});

describe("DataTable — loading state", () => {
  // A full page of placeholders keeps the table at its loaded height, so rows
  // arriving do not push the page down — the same contract as TanStack.
  const skeletonRows = (container: HTMLElement) =>
    Array.from(container.querySelectorAll("tbody tr")).filter(
      (row) => row.querySelector(".mantine-Skeleton-root") !== null,
    );

  it("renders a page of skeleton rows instead of the data", () => {
    const { container } = renderWithMantine(
      <DataTable
        columns={columns}
        data={data}
        isLoading
        withPagination
        defaultPageSize={25}
      />,
    );
    expect(skeletonRows(container)).toHaveLength(25);
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("renders 10 skeleton rows without pagination", () => {
    const { container } = renderWithMantine(
      <DataTable columns={columns} data={[]} isLoading emptyText="No data" />,
    );
    expect(skeletonRows(container)).toHaveLength(10);
    expect(screen.queryByText("No data")).not.toBeInTheDocument();
  });

  it("renders no skeleton rows when not loading", () => {
    const { container } = renderWithMantine(
      <DataTable columns={columns} data={data} />,
    );
    expect(skeletonRows(container)).toHaveLength(0);
  });
});

describe("DataTable — sorting", () => {
  it("makes a sortable column header clickable", () => {
    renderWithMantine(<DataTable columns={columns} data={data} />);
    const nameHeader = screen.getByText("Name").closest("th");
    expect(nameHeader).toBeInTheDocument();
    // sortable headers are exposed as buttons by mantine-datatable
    expect(nameHeader).toHaveAttribute("role", "button");
  });

  it("sorts rows ascending then descending when clicking a sortable header", async () => {
    const user = userEvent.setup();
    renderWithMantine(<DataTable columns={columns} data={data} />);
    const nameHeader = screen.getByText("Name").closest("th")!;

    // Initial (unsorted) order matches the source data.
    expect(nameOrder()).toEqual(["Charlie", "Alice", "Bob"]);

    // First click → ascending by name.
    await user.click(nameHeader);
    expect(nameOrder()).toEqual(["Alice", "Bob", "Charlie"]);

    // Second click → descending by name.
    await user.click(nameHeader);
    expect(nameOrder()).toEqual(["Charlie", "Bob", "Alice"]);
  });

  it("respects initialSort", () => {
    renderWithMantine(
      <DataTable
        columns={columns}
        data={data}
        initialSort={{ columnId: "name", direction: "asc" }}
      />,
    );
    expect(nameOrder()).toEqual(["Alice", "Bob", "Charlie"]);
  });

  it("sorts using a custom sortAccessor (by last name)", async () => {
    const user = userEvent.setup();
    interface Person {
      id: number;
      fullName: string;
      last: string;
    }
    const people: Person[] = [
      { id: 1, fullName: "Zoe Adams", last: "Adams" },
      { id: 2, fullName: "Amy Brown", last: "Brown" },
      { id: 3, fullName: "Bea Carter", last: "Carter" },
    ];
    const personColumns: DataTableColumn<Person>[] = [
      {
        id: "name",
        header: "Name",
        accessor: "fullName",
        sortable: true,
        sortAccessor: (row) => row.last,
      },
    ];
    renderWithMantine(<DataTable columns={personColumns} data={people} />);
    const header = screen.getByText("Name").closest("th")!;

    // Ascending by last name → Adams, Brown, Carter (i.e. Zoe, Amy, Bea).
    await user.click(header);
    const order = screen
      .getAllByRole("row")
      .filter((row) => row.querySelectorAll("td").length > 0)
      .map((row) => row.textContent)
      .filter((t) => /Adams|Brown|Carter/.test(t))
      .map((t) => /Zoe|Amy|Bea/.exec(t)![0]);
    expect(order).toEqual(["Zoe", "Amy", "Bea"]);
  });

  it("sorts by a non-primitive accessor value (booleans coerced to strings)", async () => {
    const user = userEvent.setup();
    interface Flagged {
      id: number;
      name: string;
      active: boolean;
    }
    const rows: Flagged[] = [
      { id: 1, name: "Zed", active: true },
      { id: 2, name: "Ann", active: false },
      { id: 3, name: "Mel", active: true },
    ];
    const flaggedColumns: DataTableColumn<Flagged>[] = [
      { id: "name", header: "Name", accessor: "name" },
      // Boolean accessor value is neither number nor string, so the engine
      // coerces it via String() before comparing ("false" < "true").
      { id: "active", header: "Active", accessor: "active", sortable: true },
    ];
    renderWithMantine(<DataTable columns={flaggedColumns} data={rows} />);

    await user.click(screen.getByText("Active").closest("th")!);
    const ascending = screen
      .getAllByRole("row")
      .filter((row) => row.querySelectorAll("td").length > 0)
      .map((row) => /Zed|Ann|Mel/.exec(row.textContent)![0]);
    // "false" sorts before "true": Ann first, then the two active rows.
    expect(ascending[0]).toBe("Ann");
  });
});

describe("DataTable — global filter", () => {
  it("does not render a search input by default", () => {
    renderWithMantine(<DataTable columns={columns} data={data} />);
    expect(screen.queryByPlaceholderText("Search...")).not.toBeInTheDocument();
  });

  it("renders a search input when withGlobalFilter is enabled", () => {
    renderWithMantine(
      <DataTable columns={columns} data={data} withGlobalFilter />,
    );
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });

  it("filters the visible rows as you type", async () => {
    const user = userEvent.setup();
    renderWithMantine(
      <DataTable columns={columns} data={data} withGlobalFilter />,
    );
    await user.type(screen.getByPlaceholderText("Search..."), "Alice");
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
    expect(screen.queryByText("Charlie")).not.toBeInTheDocument();
  });

  it("restores all rows when the filter is cleared", async () => {
    const user = userEvent.setup();
    renderWithMantine(
      <DataTable columns={columns} data={data} withGlobalFilter />,
    );
    const input = screen.getByPlaceholderText("Search...");
    await user.type(input, "Alice");
    await user.clear(input);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
  });

  it("shows the empty text when nothing matches the filter", async () => {
    const user = userEvent.setup();
    renderWithMantine(
      <DataTable
        columns={columns}
        data={data}
        withGlobalFilter
        emptyText="No matches"
      />,
    );
    await user.type(screen.getByPlaceholderText("Search..."), "zzznomatch");
    expect(screen.getByText("No matches")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });
});

describe("DataTable — column visibility", () => {
  it("does not render the Columns button by default", () => {
    renderWithMantine(<DataTable columns={columns} data={data} />);
    expect(
      screen.queryByRole("button", { name: "Columns" }),
    ).not.toBeInTheDocument();
  });

  it("renders a Columns button when withColumnVisibility is enabled", () => {
    renderWithMantine(
      <DataTable columns={columns} data={data} withColumnVisibility />,
    );
    expect(screen.getByRole("button", { name: "Columns" })).toBeInTheDocument();
  });

  it("opens a popover with a Toggle all checkbox plus one per hideable column", async () => {
    const user = userEvent.setup();
    renderWithMantine(
      <DataTable columns={columns} data={data} withColumnVisibility />,
    );
    await user.click(screen.getByRole("button", { name: "Columns" }));
    expect(screen.getByLabelText("Toggle all")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Score")).toBeInTheDocument();
  });

  it("removes a column header when its checkbox is unchecked, and restores it when re-checked", async () => {
    const user = userEvent.setup();
    renderWithMantine(
      <DataTable columns={columns} data={data} withColumnVisibility />,
    );
    await user.click(screen.getByRole("button", { name: "Columns" }));
    const scoreCheckbox = screen.getByLabelText("Score");

    await user.click(scoreCheckbox); // hide
    expect(hasHeader("Score")).toBe(false);
    expect(hasHeader("Name")).toBe(true);

    await user.click(scoreCheckbox); // restore
    expect(hasHeader("Score")).toBe(true);
  });

  it("starts with a defaultVisible:false column hidden and its checkbox unchecked", async () => {
    const user = userEvent.setup();
    const hiddenByDefault: DataTableColumn<Row>[] = [
      { id: "name", header: "Name", accessor: "name" },
      {
        id: "score",
        header: "Score",
        accessor: "score",
        defaultVisible: false,
      },
    ];
    renderWithMantine(
      <DataTable columns={hiddenByDefault} data={data} withColumnVisibility />,
    );
    expect(hasHeader("Score")).toBe(false);

    await user.click(screen.getByRole("button", { name: "Columns" }));
    expect(screen.getByLabelText("Score")).not.toBeChecked();
    expect(screen.getByLabelText("Name")).toBeChecked();
  });

  it("Toggle all hides every hideable column, then shows them again", async () => {
    const user = userEvent.setup();
    renderWithMantine(
      <DataTable columns={columns} data={data} withColumnVisibility />,
    );
    await user.click(screen.getByRole("button", { name: "Columns" }));
    const toggleAll = screen.getByLabelText("Toggle all");

    await user.click(toggleAll); // hide all
    expect(hasHeader("Name")).toBe(false);
    expect(hasHeader("Score")).toBe(false);

    await user.click(toggleAll); // show all
    expect(hasHeader("Name")).toBe(true);
    expect(hasHeader("Score")).toBe(true);
  });
});

describe("DataTable — pagination", () => {
  const manyRows: Row[] = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    name: `Row ${i}`,
    score: i,
  }));

  it("limits the number of rendered data rows to defaultPageSize", () => {
    renderWithMantine(
      <DataTable
        columns={columns}
        data={manyRows}
        withPagination
        defaultPageSize={5}
      />,
    );
    expect(dataRows()).toHaveLength(5);
  });

  it("renders pagination controls showing the record range", () => {
    renderWithMantine(
      <DataTable
        columns={columns}
        data={manyRows}
        withPagination
        defaultPageSize={5}
      />,
    );
    // mantine-datatable's default pagination text is `${from} - ${to} / ${total}`.
    expect(screen.getByText("1 - 5 / 30")).toBeInTheDocument();
    // Page navigation controls are present.
    expect(
      screen.getByRole("button", { name: /next page/i }),
    ).toBeInTheDocument();
  });

  it("does not render pagination controls by default", () => {
    renderWithMantine(<DataTable columns={columns} data={data} />);
    expect(
      screen.queryByRole("button", { name: /next page/i }),
    ).not.toBeInTheDocument();
  });

  it("changes the page size via the records-per-page selector", async () => {
    const user = userEvent.setup();
    renderWithMantine(
      <DataTable
        columns={columns}
        data={manyRows}
        withPagination
        defaultPageSize={5}
      />,
    );
    expect(dataRows()).toHaveLength(5);

    // The page-size control is a Mantine Menu button labelled with the current
    // size (`aria-haspopup="menu"`). Disambiguate it from the page-number
    // buttons (one of which is also "5"), open it, and pick a larger size to
    // drive onRecordsPerPageChange.
    const pageSizeButton = screen
      .getAllByRole("button", { name: "5" })
      .find((btn) => btn.getAttribute("aria-haspopup") === "menu")!;
    expect(pageSizeButton).toBeDefined();
    await user.click(pageSizeButton);

    // The menu lives in a portal whose dropdown keeps `display:none` until the
    // Mantine transition settles (which never visibly resolves under jsdom), so
    // the menu items are present but "hidden" to the a11y tree — query with
    // { hidden: true } to reach them.
    await user.click(
      screen.getByRole("menuitem", { name: "25", hidden: true }),
    );

    expect(dataRows()).toHaveLength(25);
    expect(screen.getByText("1 - 25 / 30")).toBeInTheDocument();
  });
});

describe("DataTable — row click", () => {
  it("calls onRowClick with the clicked row's data", async () => {
    const user = userEvent.setup();
    const onRowClick = jest.fn();
    renderWithMantine(
      <DataTable columns={columns} data={data} onRowClick={onRowClick} />,
    );
    await user.click(screen.getByText("Alice"));
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith({
      id: 2,
      name: "Alice",
      score: 90,
    });
  });

  it("passes the right row data for different rows", async () => {
    const user = userEvent.setup();
    const onRowClick = jest.fn();
    renderWithMantine(
      <DataTable columns={columns} data={data} onRowClick={onRowClick} />,
    );
    await user.click(screen.getByText("Bob"));
    expect(onRowClick).toHaveBeenCalledWith({ id: 3, name: "Bob", score: 75 });
  });

  it("does not throw when a row is clicked without an onRowClick handler", async () => {
    const user = userEvent.setup();
    renderWithMantine(<DataTable columns={columns} data={data} />);
    await expect(
      user.click(screen.getByText("Alice")),
    ).resolves.toBeUndefined();
  });
});

describe("DataTable — missing values sort last", () => {
  interface MRow {
    id: number;
    name: string;
    value: number | null;
  }
  const cols: DataTableColumn<MRow>[] = [
    { id: "name", header: "Name", accessor: "name" },
    { id: "value", header: "Value", accessor: "value", sortable: true },
  ];
  const mdata: MRow[] = [
    { id: 1, name: "Charlie", value: null },
    { id: 2, name: "Alice", value: 1 },
    { id: 3, name: "Bob", value: 2 },
  ];

  it("in both directions", async () => {
    const user = userEvent.setup();
    renderWithMantine(<DataTable columns={cols} data={mdata} />);
    const header = screen.getByText("Value").closest("th")!;
    await user.click(header);
    expect(nameOrder()).toEqual(["Alice", "Bob", "Charlie"]);
    await user.click(header);
    expect(nameOrder()).toEqual(["Bob", "Alice", "Charlie"]);
  });
});

describe("DataTable — column filters", () => {
  const filterColumns: DataTableColumn<Row>[] = [
    {
      id: "name",
      header: "Name",
      accessor: "name",
      filter: { type: "select" },
    },
    {
      id: "score",
      header: "Score",
      accessor: "score",
      filter: { type: "range" },
    },
  ];

  // mantine-datatable renders its own header filter button, without an
  // accessible name; find it by its class, in column order.
  const filterButtons = () =>
    Array.from(
      document.querySelectorAll<HTMLElement>(
        ".mantine-datatable-header-cell-filter-action-icon",
      ),
    );

  const renderFiltered = () =>
    render(
      <MantineProvider env="test">
        <DataTable columns={filterColumns} data={data} withGlobalFilter />
      </MantineProvider>,
    );

  it("adds a filter button only to filterable columns", () => {
    renderWithMantine(
      <DataTable columns={[filterColumns[0]!, columns[1]!]} data={data} />,
    );
    expect(filterButtons()).toHaveLength(1);
  });

  it("filters rows through the header popover and marks the column", async () => {
    const user = userEvent.setup();
    renderFiltered();
    await user.click(filterButtons()[0]!);
    await user.click(
      await screen.findByRole("combobox", { name: "Filter Name" }),
    );
    await user.click(screen.getByRole("option", { name: "Bob" }));

    expect(nameOrder()).toEqual(["Bob"]);
    expect(filterButtons()[0]).toHaveAttribute("data-active", "true");
  });

  it("filters by range and clears every filter from the toolbar", async () => {
    const user = userEvent.setup();
    renderFiltered();
    await user.click(filterButtons()[1]!);
    await user.type(await screen.findByRole("textbox", { name: "Min" }), "80");
    expect(nameOrder()).toEqual(["Charlie", "Alice"]);

    await user.click(screen.getByRole("button", { name: "Clear filters (1)" }));
    expect(nameOrder()).toEqual(["Charlie", "Alice", "Bob"]);
  });
});

describe("DataTable — the current page", () => {
  // mantine-datatable scrolls its viewport back to the top on a page change;
  // jsdom has no layout, so it has no Element.scrollTo either.
  beforeAll(() => {
    Element.prototype.scrollTo = () => {
      /* no-op: jsdom does not scroll */
    };
  });

  const rowsOf = (n: number): Row[] =>
    Array.from({ length: n }, (_, i) => ({
      id: i,
      name: `Row ${String(i).padStart(2, "0")}`,
      score: i,
    }));
  const table = (rows: Row[]) => (
    <MantineProvider>
      <DataTable
        columns={columns}
        data={rows}
        rowId={(row) => row.id}
        withPagination
        defaultPageSize={10}
      />
    </MantineProvider>
  );

  it("steps back to the last page when the data shrinks under it", async () => {
    const user = userEvent.setup();
    const { rerender } = render(table(rowsOf(30)));
    await user.click(screen.getByRole("button", { name: "3" }));
    expect(screen.getByText("Row 20")).toBeInTheDocument();

    rerender(table(rowsOf(15)));
    // Page 3 no longer exists: the table shows page 2 rather than an empty
    // slice. (Not asserted through "No data": under jsdom mantine-datatable
    // leaves its empty-state node mounted after any page change.)
    expect(screen.getByText("Row 10")).toBeInTheDocument();
    expect(screen.getByText("Row 14")).toBeInTheDocument();
    expect(screen.getByText("11 - 15 / 15")).toBeInTheDocument();
  });

  it("survives a new data array (a refetch)", async () => {
    const user = userEvent.setup();
    const { rerender } = render(table(rowsOf(30)));
    await user.click(screen.getByRole("button", { name: "2" }));
    rerender(table(rowsOf(30)));
    expect(screen.getByText("Row 10")).toBeInTheDocument();
  });
});

describe("DataTable — loading keeps the footer", () => {
  it("renders the pagination footer while loading, as when loaded", () => {
    const { container } = renderWithMantine(
      <DataTable
        columns={columns}
        data={[]}
        isLoading
        withPagination
        defaultPageSize={20}
      />,
    );
    expect(
      container.querySelector(".mantine-datatable-pagination"),
    ).toBeInTheDocument();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });
});

describe("DataTable — sort direction matches TanStack", () => {
  // mantine-datatable carries the current direction over to a newly clicked
  // column; the contract starts every column ascending.
  it("sorts a newly clicked column ascending after a descending sort", async () => {
    const user = userEvent.setup();
    renderWithMantine(
      <DataTable
        columns={columns}
        data={data}
        initialSort={{ columnId: "score", direction: "desc" }}
      />,
    );
    await user.click(screen.getByText("Name").closest("th")!);
    expect(nameOrder()).toEqual(["Alice", "Bob", "Charlie"]);
    await user.click(screen.getByText("Name").closest("th")!);
    expect(nameOrder()).toEqual(["Charlie", "Bob", "Alice"]);
  });
});

describe("DataTable — page size", () => {
  beforeAll(() => {
    Element.prototype.scrollTo = () => {
      /* no-op: jsdom does not scroll */
    };
  });

  it("keeps the first row in view when the page size changes, as TanStack does", async () => {
    const user = userEvent.setup();
    const rows: Row[] = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      name: `Row ${String(i).padStart(2, "0")}`,
      score: i,
    }));
    render(
      <MantineProvider env="test">
        <DataTable
          columns={columns}
          data={rows}
          rowId={(row) => row.id}
          withPagination
          defaultPageSize={25}
        />
      </MantineProvider>,
    );
    await user.click(screen.getByRole("button", { name: "3" }));
    expect(screen.getByText("51 - 75 / 100")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "25" }));
    await user.click(screen.getByRole("menuitem", { name: "10" }));
    expect(screen.getByText("51 - 60 / 100")).toBeInTheDocument();
  });
});

describe("DataTable — initialSort", () => {
  it("shows no sort arrow for an unsortable initialSort column", () => {
    renderWithMantine(
      <DataTable
        columns={[
          { id: "name", header: "Name", accessor: "name" },
          { id: "score", header: "Score", accessor: "score", sortable: true },
        ]}
        data={data}
        initialSort={{ columnId: "name", direction: "asc" }}
      />,
    );
    // mantine-datatable labels its arrow ("Sorted ascending", "Not sorted").
    expect(
      screen.queryByRole("img", { name: /^Sorted (ascending|descending)$/ }),
    ).not.toBeInTheDocument();
  });

  it("is ignored for a column that is not sortable, as in TanStack", () => {
    renderWithMantine(
      <DataTable
        columns={[
          { id: "name", header: "Name", accessor: "name" },
          { id: "score", header: "Score", accessor: "score" },
        ]}
        data={data}
        initialSort={{ columnId: "name", direction: "asc" }}
      />,
    );
    expect(nameOrder()).toEqual(["Charlie", "Alice", "Bob"]);
  });
});
