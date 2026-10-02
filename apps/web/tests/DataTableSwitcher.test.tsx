import "@testing-library/jest-dom/jest-globals";

import React from "react";
import {
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { DataTableColumn } from "@jitaspace/datatable";

import { DataTable } from "~/components/DataTable";
import {
  DEFAULT_DATA_TABLE_ENGINE,
  usePreferencesStore,
} from "~/lib/preferences";

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

afterEach(() => {
  usePreferencesStore.setState({ dataTableEngine: DEFAULT_DATA_TABLE_ENGINE });
});

interface Row {
  id: number;
  name: string;
  score: number;
}

const columns: DataTableColumn<Row>[] = [
  { id: "name", header: "Name", accessor: "name", sortable: true },
  {
    id: "score",
    header: "Score",
    accessor: "score",
    sortable: true,
    align: "right",
    filter: { type: "range" },
  },
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

// Each engine leaves a recognisable trace: TanStack draws its own filter
// button and sort glyphs; mantine-datatable renders its own classed table.
const isTanstack = () =>
  screen.queryByRole("button", { name: "Filter Score" }) !== null;
const isMantineDatatable = () =>
  document.querySelector(".mantine-datatable") !== null;

describe("DataTable engine switch", () => {
  it("defaults to TanStack", () => {
    expect(DEFAULT_DATA_TABLE_ENGINE).toBe("tanstack");
    wrap();
    expect(isTanstack()).toBe(true);
    expect(isMantineDatatable()).toBe(false);
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("renders mantine-datatable when that engine is selected", () => {
    usePreferencesStore.setState({ dataTableEngine: "mantine-datatable" });
    wrap();
    expect(isMantineDatatable()).toBe(true);
    expect(isTanstack()).toBe(false);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("switches live when the setting changes", () => {
    wrap();
    expect(isTanstack()).toBe(true);
    React.act(() => {
      usePreferencesStore.setState({ dataTableEngine: "mantine-datatable" });
    });
    expect(isMantineDatatable()).toBe(true);
  });

  it.each(["tanstack", "mantine-datatable"] as const)(
    "%s: renders the shared toolbar and searches the same way",
    async (engine) => {
      usePreferencesStore.setState({ dataTableEngine: engine });
      wrap();
      expect(screen.getByRole("button", { name: "Columns" })).toBeVisible();
      await userEvent.type(screen.getByPlaceholderText("Search..."), "bob");
      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    },
  );
});
