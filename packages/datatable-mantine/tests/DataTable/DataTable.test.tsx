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
  dataRows().map((row) => /Alice|Bob|Charlie/.exec((row.textContent))![0]);

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
  // mantine-datatable always keeps a `.mantine-datatable-loader` element in the
  // DOM; it adds the `--fetching` modifier (and the actual <Loader>) only while
  // `fetching` is true. So we key off the modifier class, not mere presence.
  it("renders without crashing while loading and shows the loader overlay", () => {
    const { container } = renderWithMantine(
      <DataTable columns={columns} data={data} isLoading />,
    );
    expect(
      container.querySelector(".mantine-datatable-loader-fetching"),
    ).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("does not show the active loader overlay when not loading", () => {
    const { container } = renderWithMantine(
      <DataTable columns={columns} data={data} />,
    );
    expect(
      container.querySelector(".mantine-datatable-loader-fetching"),
    ).not.toBeInTheDocument();
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
      .map((row) => /Zed|Ann|Mel/.exec((row.textContent))![0]);
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
    await user.click(screen.getByRole("menuitem", { name: "25", hidden: true }));

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
    await expect(user.click(screen.getByText("Alice"))).resolves.toBeUndefined();
  });
});
