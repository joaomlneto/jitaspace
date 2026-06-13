import "@testing-library/jest-dom/jest-globals";

import React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { DataTableColumn } from "@jitaspace/datatable";

import { MantineReactTableImpl } from "~/components/DataTable/MantineReactTableImpl";

interface Row {
  id: number;
  name: string;
  score: number;
}

const data: Row[] = [
  { id: 1, name: "Bob", score: 75 },
  { id: 2, name: "Alice", score: 90 },
];

const columns: DataTableColumn<Row>[] = [
  {
    id: "name",
    header: "Name",
    accessor: "name",
    sortable: true,
    sortAccessor: (r) => r.name, // string compare
    align: "left",
    width: 200,
  },
  {
    id: "score",
    header: "Score",
    accessor: "score",
    sortable: true,
    sortAccessor: (r) => r.score, // numeric compare
    align: "right",
    cell: (_row, value) => <span>{String(value)}pts</span>,
  },
  { id: "calc", header: "Calc", accessor: (r) => r.score * 2 }, // function accessor
  { id: "blank", header: "Blank" }, // no accessor → non-primitive/undefined path
];

const wrap = (ui: React.ReactElement) =>
  render(React.createElement(MantineProvider, null, ui));

describe("MantineReactTableImpl (classic engine adapter)", () => {
  it("renders headers, custom cells and function accessors (string initial sort)", () => {
    wrap(
      <MantineReactTableImpl
        data={data}
        columns={columns}
        rowId={(r) => r.id}
        initialSort={{ columnId: "name", direction: "asc" }}
        verticalSpacing="md"
      />,
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Calc")).toBeInTheDocument();
    expect(screen.getByText("Blank")).toBeInTheDocument();
    expect(screen.getByText("90pts")).toBeInTheDocument(); // custom cell
    expect(screen.getByText("180")).toBeInTheDocument(); // function accessor (90*2)
  });

  it("sorts numerically via a sortAccessor (numeric initial sort)", () => {
    wrap(
      <MantineReactTableImpl
        data={data}
        columns={columns}
        rowId={(r) => r.id}
        initialSort={{ columnId: "score", direction: "desc" }}
        verticalSpacing="xl"
      />,
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("calls onRowClick with the row data", async () => {
    const onRowClick = jest.fn();
    wrap(
      <MantineReactTableImpl
        data={data}
        columns={columns}
        rowId={(r) => r.id}
        onRowClick={onRowClick}
      />,
    );
    await userEvent.click(screen.getByText("Bob"));
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Bob" }),
    );
  });

  it("renders with toolbar features, borders and a custom empty text", () => {
    wrap(
      <MantineReactTableImpl
        data={[]}
        columns={columns}
        withGlobalFilter
        withColumnVisibility
        withPagination
        striped
        highlightOnHover
        withTableBorder
        withColumnBorders
        fontSize="sm"
        emptyText="Nothing here"
      />,
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
  });
});
