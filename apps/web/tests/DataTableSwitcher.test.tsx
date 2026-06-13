import "@testing-library/jest-dom/jest-globals";

import React from "react";
import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { DataTableColumn } from "@jitaspace/datatable";

import { DataTable } from "~/components/DataTable";
import { usePreferencesStore } from "~/lib/preferences";

// mantine-datatable hides every cell behind a media-query check; the shared
// matchMedia stub reports all queries unmatched, which blanks the table. Make an
// empty / no-constraint query match so its cells render under jsdom.
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: query.trim() === "",
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
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
  { id: "score", header: "Score", accessor: "score", sortable: true, align: "right" },
];

const data: Row[] = [
  { id: 1, name: "Alice", score: 90 },
  { id: 2, name: "Bob", score: 75 },
];

const wrap = () =>
  render(
    React.createElement(
      MantineProvider,
      null,
      React.createElement(DataTable<Row>, {
        data,
        columns,
        rowId: (row) => row.id,
        withGlobalFilter: true,
        withColumnVisibility: true,
        withPagination: true,
        initialSort: { columnId: "name", direction: "asc" },
      }),
    ),
  );

describe("DataTable switcher — experimental disabled (classic MRT)", () => {
  beforeEach(() => {
    usePreferencesStore.setState({ experimentalDataTables: false });
  });

  it("renders the classic engine with the data and no engine selector", () => {
    wrap();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    // No per-table engine selector when experimental is off.
    expect(screen.queryByText("Table engine")).not.toBeInTheDocument();
  });
});

describe("DataTable switcher — experimental enabled", () => {
  beforeEach(() => {
    usePreferencesStore.setState({ experimentalDataTables: true });
  });

  it("shows the engine selector and renders the default (TanStack) engine", () => {
    wrap();
    expect(screen.getByText("Table engine")).toBeInTheDocument();
    expect(screen.getByText("TanStack")).toBeInTheDocument();
    expect(screen.getByText("Classic")).toBeInTheDocument();
    expect(screen.getByText("mantine-datatable")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("switches to the mantine-datatable engine", async () => {
    wrap();
    await userEvent.click(screen.getByText("mantine-datatable"));
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("switches to the classic engine", async () => {
    wrap();
    await userEvent.click(screen.getByText("Classic"));
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });
});
