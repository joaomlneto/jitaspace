import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { DataTableColumn } from "@jitaspace/datatable";

import { DataTable } from "../../DataTable/TanstackDataTable";

interface Row {
  name: string;
  score: number;
}

const columns: DataTableColumn<Row>[] = [
  { id: "name", header: "Name", accessor: "name", sortable: true },
  { id: "score", header: "Score", accessor: "score", sortable: true },
];

const unsortableColumns: DataTableColumn<Row>[] = [
  { id: "name", header: "Name", accessor: "name" },
  { id: "score", header: "Score", accessor: "score" },
];

const data: Row[] = [
  { name: "Alice", score: 90 },
  { name: "Bob", score: 75 },
  { name: "Charlie", score: 82 },
];

const renderWithMantine = (ui: React.ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

describe("DataTable — basic rendering", () => {
  it("renders column headers", () => {
    renderWithMantine(<DataTable columns={columns} data={data} />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Score")).toBeInTheDocument();
  });

  it("renders all row data", () => {
    renderWithMantine(<DataTable columns={columns} data={data} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
  });

  // The pagination feature is always registered; without `withPagination`
  // it must pass every row through, not cut them to a default page of 10.
  it("renders every row without pagination, beyond one page's worth", () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      name: `Row ${i}`,
      score: i,
    }));
    renderWithMantine(<DataTable columns={columns} data={many} />);
    expect(screen.getByText("Row 0")).toBeInTheDocument();
    expect(screen.getByText("Row 24")).toBeInTheDocument();
  });
});

describe("DataTable — empty state", () => {
  it("shows default empty text when data is empty", () => {
    renderWithMantine(<DataTable columns={columns} data={[]} />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("shows custom emptyText when data is empty", () => {
    renderWithMantine(
      <DataTable columns={columns} data={[]} emptyText="Nothing here" />,
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("does not render rows when data is empty", () => {
    renderWithMantine(<DataTable columns={columns} data={[]} />);
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });
});

describe("DataTable — loading state", () => {
  it("does not render row data when isLoading is true", () => {
    renderWithMantine(<DataTable columns={columns} data={data} isLoading />);
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
  });

  it("does not show the empty state when isLoading is true and data is empty", () => {
    renderWithMantine(
      <DataTable columns={columns} data={[]} isLoading emptyText="No data" />,
    );
    expect(screen.queryByText("No data")).not.toBeInTheDocument();
  });

  // A full page of placeholders keeps the table at its loaded height, so rows
  // arriving do not push the page down (the market page's CLS fix needs this).
  it("renders one skeleton row per row of the page size", () => {
    const { container } = renderWithMantine(
      <DataTable
        columns={columns}
        data={[]}
        isLoading
        withPagination
        defaultPageSize={20}
      />,
    );
    expect(container.querySelectorAll("tr[data-skeleton]")).toHaveLength(20);
  });

  it("renders 10 skeleton rows without pagination", () => {
    const { container } = renderWithMantine(
      <DataTable columns={columns} data={[]} isLoading />,
    );
    expect(container.querySelectorAll("tr[data-skeleton]")).toHaveLength(10);
  });
});

describe("DataTable — sorting", () => {
  it("renders a sort indicator (⇅) on sortable columns", () => {
    renderWithMantine(<DataTable columns={columns} data={data} />);
    const indicators = screen.getAllByText("⇅");
    expect(indicators.length).toBe(2); // one per sortable column
  });

  it("does not render sort indicators on non-sortable columns", () => {
    renderWithMantine(<DataTable columns={unsortableColumns} data={data} />);
    expect(screen.queryByText("⇅")).not.toBeInTheDocument();
  });

  it("shows ↑ after clicking a sortable header once (ascending)", async () => {
    renderWithMantine(<DataTable columns={columns} data={data} />);
    const nameHeader = screen.getByText("Name").closest("th")!;
    await userEvent.click(nameHeader);
    expect(screen.getByText("↑")).toBeInTheDocument();
  });

  it("shows ↓ after clicking a sortable header twice (descending)", async () => {
    renderWithMantine(<DataTable columns={columns} data={data} />);
    const nameHeader = screen.getByText("Name").closest("th")!;
    await userEvent.click(nameHeader);
    await userEvent.click(nameHeader);
    expect(screen.getByText("↓")).toBeInTheDocument();
  });

  // As mantine-datatable does: two states, never back to unsorted.
  it("toggles between ascending and descending on further clicks", async () => {
    renderWithMantine(<DataTable columns={columns} data={data} />);
    const nameHeader = screen.getByText("Name").closest("th")!;
    await userEvent.click(nameHeader);
    await userEvent.click(nameHeader);
    await userEvent.click(nameHeader);
    expect(screen.getByText("↑")).toBeInTheDocument();
    expect(screen.getAllByText("⇅")).toHaveLength(1);
  });

  it("sorts a numeric column ascending on the first click", async () => {
    renderWithMantine(<DataTable columns={columns} data={data} />);
    await userEvent.click(screen.getByText("Score").closest("th")!);
    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Bob"); // 75
    expect(rows[3]).toHaveTextContent("Alice"); // 90
  });

  // The market's sell orders start sorted ascending by price; TanStack's
  // defaults (numbers descending first, then unsorted) made the first click on
  // that header drop the sort altogether.
  it("flips an initial ascending sort to descending on the first click", async () => {
    renderWithMantine(
      <DataTable
        columns={columns}
        data={data}
        initialSort={{ columnId: "score", direction: "asc" }}
      />,
    );
    const header = screen.getByText("Score").closest("th")!;
    expect(header).toHaveAttribute("aria-sort", "ascending");
    await userEvent.click(header);
    expect(header).toHaveAttribute("aria-sort", "descending");
    expect(screen.getAllByRole("row")[1]).toHaveTextContent("Alice");
  });

  it("sorts by one column at a time, even with Shift held", async () => {
    renderWithMantine(<DataTable columns={columns} data={data} />);
    await userEvent.click(screen.getByText("Name").closest("th")!);
    const user = userEvent.setup();
    await user.keyboard("{Shift>}");
    await user.click(screen.getByText("Score").closest("th")!);
    await user.keyboard("{/Shift}");
    expect(
      document.querySelectorAll('th[aria-sort]:not([aria-sort="none"])'),
    ).toHaveLength(1);
  });

  it("sorts from the keyboard", async () => {
    renderWithMantine(<DataTable columns={columns} data={data} />);
    const nameHeader = screen.getByText("Name").closest("th")!;
    expect(nameHeader).toHaveAttribute("tabindex", "0");
    nameHeader.focus();
    await userEvent.keyboard("{Enter}");
    expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
    await userEvent.keyboard(" ");
    expect(nameHeader).toHaveAttribute("aria-sort", "descending");
  });

  it("does not sort when Enter is pressed on the header's filter button", async () => {
    renderWithMantine(
      <DataTable
        columns={[{ ...columns[0]!, filter: { type: "text" } }]}
        data={data}
      />,
    );
    screen.getByRole("button", { name: "Filter Name" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByText("Name").closest("th")).toHaveAttribute(
      "aria-sort",
      "none",
    );
  });

  it("does not make unsortable headers focusable", () => {
    renderWithMantine(<DataTable columns={unsortableColumns} data={data} />);
    const header = screen.getByText("Name").closest("th");
    expect(header).not.toHaveAttribute("tabindex");
    expect(header).not.toHaveAttribute("aria-sort");
  });

  // "none" is how a header says it can be sorted but is not, so assistive
  // tech announces it as sortable before the first sort.
  it("marks sortable but unsorted headers aria-sort=none", () => {
    renderWithMantine(<DataTable columns={columns} data={data} />);
    expect(screen.getByText("Name").closest("th")).toHaveAttribute(
      "aria-sort",
      "none",
    );
  });

  it("sorts rows ascending by name", async () => {
    renderWithMantine(<DataTable columns={columns} data={data} />);
    const nameHeader = screen.getByText("Name").closest("th")!;
    await userEvent.click(nameHeader);
    const rows = screen.getAllByRole("row");
    // rows[0] is the header row; rows[1..3] are data rows
    expect(rows[1]).toHaveTextContent("Alice");
    expect(rows[2]).toHaveTextContent("Bob");
    expect(rows[3]).toHaveTextContent("Charlie");
  });

  it("sorts rows descending by name", async () => {
    renderWithMantine(<DataTable columns={columns} data={data} />);
    const nameHeader = screen.getByText("Name").closest("th")!;
    await userEvent.click(nameHeader);
    await userEvent.click(nameHeader);
    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Charlie");
    expect(rows[2]).toHaveTextContent("Bob");
    expect(rows[3]).toHaveTextContent("Alice");
  });
});

describe("DataTable — global filter", () => {
  it("does not render a search input by default", () => {
    renderWithMantine(<DataTable columns={columns} data={data} />);
    expect(screen.queryByPlaceholderText("Search...")).not.toBeInTheDocument();
  });

  it("renders a search input when withGlobalFilter is true", () => {
    renderWithMantine(
      <DataTable columns={columns} data={data} withGlobalFilter />,
    );
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });

  it("filters rows to only those matching the search term", async () => {
    renderWithMantine(
      <DataTable columns={columns} data={data} withGlobalFilter />,
    );
    await userEvent.type(screen.getByPlaceholderText("Search..."), "Alice");
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
    expect(screen.queryByText("Charlie")).not.toBeInTheDocument();
  });

  it("shows all rows when the search input is cleared", async () => {
    renderWithMantine(
      <DataTable columns={columns} data={data} withGlobalFilter />,
    );
    const input = screen.getByPlaceholderText("Search...");
    await userEvent.type(input, "Alice");
    await userEvent.clear(input);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
  });

  it("shows the empty state when no rows match the filter", async () => {
    renderWithMantine(
      <DataTable columns={columns} data={data} withGlobalFilter />,
    );
    await userEvent.type(
      screen.getByPlaceholderText("Search..."),
      "zzznomatch",
    );
    expect(screen.getByText("No data")).toBeInTheDocument();
  });
});

describe("DataTable — pagination", () => {
  it("does not render pagination controls by default", () => {
    renderWithMantine(<DataTable columns={columns} data={data} />);
    expect(screen.queryByText("Rows per page:")).not.toBeInTheDocument();
  });

  it("renders pagination controls when withPagination is true", () => {
    renderWithMantine(
      <DataTable columns={columns} data={data} withPagination />,
    );
    expect(screen.getByText("Rows per page:")).toBeInTheDocument();
  });

  it("shows the total filtered row count", () => {
    renderWithMantine(
      <DataTable columns={columns} data={data} withPagination />,
    );
    expect(screen.getByText("3 rows")).toBeInTheDocument();
  });

  it("respects defaultPageSize", () => {
    const manyRows: Row[] = Array.from({ length: 30 }, (_, i) => ({
      name: `Row ${i}`,
      score: i,
    }));
    renderWithMantine(
      <DataTable
        columns={columns}
        data={manyRows}
        withPagination
        defaultPageSize={5}
      />,
    );
    // Only 5 rows should be visible on the first page
    const rows = screen.getAllByRole("row");
    expect(rows.length).toBe(6); // 5 data rows + 1 header row
  });
});

describe("DataTable — row click", () => {
  it("calls onRowClick with the correct row data", async () => {
    const onRowClick = jest.fn();
    renderWithMantine(
      <DataTable columns={columns} data={data} onRowClick={onRowClick} />,
    );
    await userEvent.click(screen.getByText("Alice"));
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith({ name: "Alice", score: 90 });
  });

  it("calls onRowClick with the correct data for different rows", async () => {
    const onRowClick = jest.fn();
    renderWithMantine(
      <DataTable columns={columns} data={data} onRowClick={onRowClick} />,
    );
    await userEvent.click(screen.getByText("Bob"));
    expect(onRowClick).toHaveBeenCalledWith({ name: "Bob", score: 75 });
  });

  it("does not throw when clicking rows without an onRowClick handler", async () => {
    renderWithMantine(<DataTable columns={columns} data={data} />);
    await expect(
      userEvent.click(screen.getByText("Alice")),
    ).resolves.toBeUndefined();
  });

  it("applies pointer cursor style to rows when onRowClick is provided", () => {
    renderWithMantine(
      <DataTable columns={columns} data={data} onRowClick={jest.fn()} />,
    );
    const allRows = screen.getAllByRole("row");
    const firstDataRow = allRows[1]!;
    expect(firstDataRow).toHaveStyle("cursor: pointer");
  });

  it("does not apply pointer cursor style when onRowClick is not provided", () => {
    renderWithMantine(<DataTable columns={columns} data={data} />);
    const allRows = screen.getAllByRole("row");
    const firstDataRow = allRows[1]!;
    expect(firstDataRow).not.toHaveStyle("cursor: pointer");
  });
});

describe("DataTable — column visibility", () => {
  it("does not render the Columns control by default", () => {
    renderWithMantine(<DataTable columns={columns} data={data} />);
    expect(
      screen.queryByRole("button", { name: "Columns" }),
    ).not.toBeInTheDocument();
  });

  it("renders a Columns control when withColumnVisibility is true", () => {
    renderWithMantine(
      <DataTable columns={columns} data={data} withColumnVisibility />,
    );
    expect(screen.getByRole("button", { name: "Columns" })).toBeInTheDocument();
  });

  it("opens a menu with a checkbox per column plus a toggle-all", async () => {
    renderWithMantine(
      <DataTable columns={columns} data={data} withColumnVisibility />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Columns" }));
    expect(screen.getByLabelText("Toggle all")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Score")).toBeInTheDocument();
  });

  it("hides a column's header when its checkbox is unchecked", async () => {
    renderWithMantine(
      <DataTable columns={columns} data={data} withColumnVisibility />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Columns" }));
    await userEvent.click(screen.getByLabelText("Score"));
    // The "Score" header is gone, but the "Name" header remains.
    expect(
      screen.queryByRole("columnheader", { name: /Score/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /Name/ }),
    ).toBeInTheDocument();
  });

  it("restores a hidden column when its checkbox is re-checked", async () => {
    renderWithMantine(
      <DataTable columns={columns} data={data} withColumnVisibility />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Columns" }));
    const scoreCheckbox = screen.getByLabelText("Score");
    await userEvent.click(scoreCheckbox); // hide
    await userEvent.click(scoreCheckbox); // show again
    expect(
      screen.getByRole("columnheader", { name: /Score/ }),
    ).toBeInTheDocument();
  });

  it("honors defaultVisible: false (column hidden + checkbox unchecked)", async () => {
    const columnsWithHiddenScore: DataTableColumn<Row>[] = [
      { id: "name", header: "Name", accessor: "name", sortable: true },
      {
        id: "score",
        header: "Score",
        accessor: "score",
        sortable: true,
        defaultVisible: false,
      },
    ];
    renderWithMantine(
      <DataTable
        columns={columnsWithHiddenScore}
        data={data}
        withColumnVisibility
      />,
    );
    expect(
      screen.queryByRole("columnheader", { name: /Score/ }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Columns" }));
    expect(screen.getByLabelText("Score")).not.toBeChecked();
  });

  it("toggle-all hides every column, then shows them again", async () => {
    renderWithMantine(
      <DataTable columns={columns} data={data} withColumnVisibility />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Columns" }));
    const toggleAll = screen.getByLabelText("Toggle all");
    await userEvent.click(toggleAll); // hide all
    expect(screen.queryByRole("columnheader")).not.toBeInTheDocument();
    await userEvent.click(toggleAll); // show all
    expect(screen.getAllByRole("columnheader").length).toBe(2);
  });
});

describe("DataTable — custom sortAccessor & display-only columns", () => {
  it("sorts numerically via a custom sortAccessor", async () => {
    const cols: DataTableColumn<Row>[] = [
      { id: "name", header: "Name", accessor: "name" },
      {
        id: "rank",
        header: "Rank",
        accessor: "score",
        sortable: true,
        sortAccessor: (r) => r.score,
      },
    ];
    renderWithMantine(<DataTable columns={cols} data={data} />);
    const rankHeader = screen.getByText("Rank").closest("th")!;

    await userEvent.click(rankHeader); // ascending
    let rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Bob"); // 75
    expect(rows[3]).toHaveTextContent("Alice"); // 90

    await userEvent.click(rankHeader); // descending
    rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Alice");
  });

  it("sorts a sortAccessor returning string and null values", async () => {
    interface LRow {
      label: string | null;
    }
    const cols: DataTableColumn<LRow>[] = [
      {
        id: "label",
        header: "Label",
        accessor: "label",
        sortable: true,
        sortAccessor: (r) => r.label,
      },
    ];
    const ldata: LRow[] = [
      { label: "b" },
      { label: null },
      { label: null },
      { label: "a" },
    ];
    renderWithMantine(<DataTable columns={cols} data={ldata} />);
    await userEvent.click(screen.getByText("Label").closest("th")!);
    // header + 4 rows; sorting executes compareValues over null/string pairs
    expect(screen.getAllByRole("row")).toHaveLength(5);
  });

  it("renders a no-accessor column and a function accessor, keyed by rowId", () => {
    const cols: DataTableColumn<Row>[] = [
      { id: "blank", header: "Blank" }, // no accessor, no cell -> empty render
      { id: "label", header: "Label", accessor: (r) => `${r.name}-${r.score}` },
    ];
    renderWithMantine(
      <DataTable columns={cols} data={data} rowId={(r) => r.name} />,
    );
    expect(screen.getByText("Alice-90")).toBeInTheDocument();
    expect(screen.getByText("Blank")).toBeInTheDocument();
  });
});

describe("DataTable — pagination interaction", () => {
  const many: Row[] = Array.from({ length: 30 }, (_, i) => ({
    name: `Row ${i}`,
    score: i,
  }));

  it("changes the current page", async () => {
    renderWithMantine(
      <DataTable
        columns={columns}
        data={many}
        withPagination
        defaultPageSize={10}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "2" }));
    expect(screen.getByText("Row 10")).toBeInTheDocument();
  });
});

describe("DataTable — missing values sort last", () => {
  interface MRow {
    name: string;
    value: number | null;
  }
  const cols: DataTableColumn<MRow>[] = [
    { id: "name", header: "Name", accessor: "name" },
    { id: "value", header: "Value", accessor: "value", sortable: true },
  ];
  const mdata: MRow[] = [
    { name: "none", value: null },
    { name: "one", value: 1 },
    { name: "two", value: 2 },
  ];
  const order = () =>
    screen
      .getAllByRole("row")
      .slice(1)
      .map((row) => row.textContent);

  it("in both directions", async () => {
    renderWithMantine(<DataTable columns={cols} data={mdata} />);
    const header = screen.getByText("Value").closest("th")!;
    await userEvent.click(header);
    expect(order()).toEqual(["one1", "two2", "none"]);
    await userEvent.click(header);
    expect(order()).toEqual(["two2", "one1", "none"]);
  });
});

describe("DataTable — global filter reads the displayed value", () => {
  it("does not match a date column's timestamp", async () => {
    interface DRow {
      label: string;
      when: Date;
    }
    const when = new Date(1_700_000_000_000);
    renderWithMantine(
      <DataTable<DRow>
        columns={[
          { id: "label", header: "Label", accessor: "label" },
          { id: "when", header: "When", accessor: "when", sortable: true },
        ]}
        data={[{ label: "x", when }]}
        withGlobalFilter
      />,
    );
    await userEvent.type(screen.getByPlaceholderText("Search..."), "1700");
    expect(screen.getByText("No data")).toBeInTheDocument();
  });
});

describe("DataTable — column filters", () => {
  const filterColumns: DataTableColumn<Row>[] = [
    {
      id: "name",
      header: "Name",
      accessor: "name",
      sortable: true,
      filter: { type: "select" },
    },
    {
      id: "score",
      header: "Score",
      accessor: "score",
      filter: { type: "range" },
    },
  ];
  const renderFiltered = () =>
    render(
      <MantineProvider env="test">
        <DataTable
          columns={filterColumns}
          data={data}
          withGlobalFilter
          withPagination
        />
      </MantineProvider>,
    );

  it("adds a filter button only to filterable columns", () => {
    renderWithMantine(
      <DataTable columns={[filterColumns[0]!, columns[1]!]} data={data} />,
    );
    expect(
      screen
        .getAllByRole("button", { name: /^Filter / })
        .map((b) => b.getAttribute("aria-label")),
    ).toEqual(["Filter Name"]);
  });

  it("filters rows through the header popover, without sorting the column", async () => {
    renderFiltered();
    await userEvent.click(screen.getByRole("button", { name: "Filter Name" }));
    await userEvent.click(
      await screen.findByRole("combobox", { name: "Filter Name" }),
    );
    await userEvent.click(screen.getByRole("option", { name: "Bob" }));

    const body = screen.getAllByRole("rowgroup")[1]!;
    expect(within(body).getByText("Bob")).toBeInTheDocument();
    expect(within(body).queryByText("Alice")).not.toBeInTheDocument();
    expect(screen.getByText("1 rows")).toBeInTheDocument();
    // Clicks inside the popover bubble (through React) to the header cell.
    expect(screen.getByText("⇅")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filter Name" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("combines with other filters and clears them all from the toolbar", async () => {
    renderFiltered();
    await userEvent.click(screen.getByRole("button", { name: "Filter Score" }));
    await userEvent.type(
      await screen.findByRole("textbox", { name: "Min" }),
      "80",
    );
    expect(screen.getByText("2 rows")).toBeInTheDocument(); // 90, 82
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Clear filters (1)" }),
    );
    expect(screen.getByText("3 rows")).toBeInTheDocument();
  });
});

describe("DataTable — page size choices", () => {
  const many: Row[] = Array.from({ length: 30 }, (_, i) => ({
    name: `Row ${i}`,
    score: i,
  }));

  it("offers the table's own default page size", () => {
    renderWithMantine(
      <DataTable
        columns={columns}
        data={many}
        withPagination
        defaultPageSize={20}
      />,
    );
    expect(screen.getByRole("combobox", { name: "Rows per page" })).toHaveValue(
      "20",
    );
  });

  it("keeps the size when the current one is picked again", async () => {
    render(
      <MantineProvider env="test">
        <DataTable columns={columns} data={many} withPagination />
      </MantineProvider>,
    );
    const select = screen.getByRole("combobox", { name: "Rows per page" });
    await userEvent.click(select);
    await userEvent.click(screen.getByRole("option", { name: "25" }));
    await userEvent.click(select);
    await userEvent.click(screen.getByRole("option", { name: "25" }));
    expect(select).toHaveValue("25");
  });
});

describe("DataTable — the current page", () => {
  const rowsOf = (n: number): Row[] =>
    Array.from({ length: n }, (_, i) => ({
      name: `Row ${String(i).padStart(2, "0")}`,
      score: i,
    }));
  const table = (rows: Row[]) => (
    <MantineProvider>
      <DataTable
        columns={columns}
        data={rows}
        withGlobalFilter
        withPagination
        defaultPageSize={10}
      />
    </MantineProvider>
  );

  it("survives a new data array (a refetch)", async () => {
    const { rerender } = render(table(rowsOf(30)));
    await userEvent.click(screen.getByRole("button", { name: "2" }));
    expect(screen.getByText("Row 10")).toBeInTheDocument();

    rerender(table(rowsOf(30))); // equal rows, new identity
    // TanStack queues its auto-reset in a microtask; let it run, or this would
    // pass even with the reset on.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText("Row 10")).toBeInTheDocument();
    expect(screen.queryByText("Row 00")).not.toBeInTheDocument();
  });

  it("steps back to the last page when the data shrinks under it", async () => {
    const { rerender } = render(table(rowsOf(30)));
    await userEvent.click(screen.getByRole("button", { name: "3" }));
    expect(screen.getByText("Row 20")).toBeInTheDocument();

    rerender(table(rowsOf(15)));
    expect(screen.queryByText("No data")).not.toBeInTheDocument();
    expect(screen.getByText("Row 10")).toBeInTheDocument();
    expect(screen.getByText("Row 14")).toBeInTheDocument();
  });

  it("returns to the first page when the search changes", async () => {
    render(table(rowsOf(30)));
    await userEvent.click(screen.getByRole("button", { name: "3" }));
    await userEvent.type(screen.getByPlaceholderText("Search..."), "Row");
    expect(screen.getByText("Row 00")).toBeInTheDocument();
  });

  it("returns to the first page when the sort changes", async () => {
    render(table(rowsOf(30)));
    await userEvent.click(screen.getByRole("button", { name: "3" }));
    await userEvent.click(screen.getByText("Name").closest("th")!);
    expect(screen.getByText("Row 00")).toBeInTheDocument();
  });
});
