import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { type ColumnDef } from "@tanstack/react-table";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DataTable } from "../../DataTable/DataTable";

interface Row {
  name: string;
  score: number;
}

const columns: ColumnDef<Row>[] = [
  { accessorKey: "name", header: "Name", enableSorting: true },
  { accessorKey: "score", header: "Score", enableSorting: true },
];

const unsortableColumns: ColumnDef<Row>[] = [
  { accessorKey: "name", header: "Name", enableSorting: false },
  { accessorKey: "score", header: "Score", enableSorting: false },
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

  it("resets sort indicator to ⇅ after clicking three times", async () => {
    renderWithMantine(<DataTable columns={columns} data={data} />);
    const nameHeader = screen.getByText("Name").closest("th")!;
    await userEvent.click(nameHeader);
    await userEvent.click(nameHeader);
    await userEvent.click(nameHeader);
    const indicators = screen.getAllByText("⇅");
    expect(indicators.length).toBe(2);
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
    expect(
      screen.getByRole("button", { name: "Columns" }),
    ).toBeInTheDocument();
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

  it("honors initialColumnVisibility (column hidden + checkbox unchecked)", async () => {
    renderWithMantine(
      <DataTable
        columns={columns}
        data={data}
        withColumnVisibility
        initialColumnVisibility={{ score: false }}
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
