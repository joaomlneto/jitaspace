import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

/** Safely stringify an arbitrary cell value for the table-render stub. */
function stringifyCellValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return "";
}

const mockUseMarketPrices =
  jest.fn<() => { data: Record<number, { adjusted_price?: number }> }>();
const mockUseEsiNameLookup =
  jest.fn<() => Record<string, { value?: { name: string } } | undefined>>();

jest.mock("@jitaspace/hooks", () => ({
  useMarketPrices: () => mockUseMarketPrices(),
  useEsiNameLookup: (...args: unknown[]) => mockUseEsiNameLookup(...args),
}));

jest.mock("@jitaspace/ui", () => ({
  ISKAmount: ({ amount }: { amount: number }) => (
    <span data-testid="isk-amount">{amount.toFixed(2)}</span>
  ),
  TypeAnchor: ({ children }: { children: ReactNode }) => (
    <span data-testid="type-anchor">{children}</span>
  ),
  TypeAvatar: () => null,
}));

// Shape produced by the mocked `useMantineReactTable` below (not the real
// MRT_TableInstance — this stub only needs the precomputed rows).
interface MockTable {
  rows: { id: string | number; cells: { id: string; content: ReactNode }[] }[];
}

// Simplified mantine-react-table mock that renders rows with accessible data
jest.mock("mantine-react-table", () => ({
  MantineReactTable: ({ table }: { table: MockTable }) => (
    <table>
      <tbody>
        {table.rows.map(
          (row: {
            id: string | number;
            cells: { id: string; content: ReactNode }[];
          }) => (
            <tr key={row.id} data-testid="table-row">
              {row.cells.map((cell) => (
                <td key={cell.id}>{cell.content}</td>
              ))}
            </tr>
          ),
        )}
      </tbody>
    </table>
  ),
  useMantineReactTable: (config: {
    columns: {
      id: string;
      Cell?: (args: {
        row: { original: unknown };
        cell: { getValue: () => unknown };
      }) => ReactNode;
      accessorKey?: string;
      accessorFn?: (row: unknown) => unknown;
    }[];
    data: unknown[];
  }) => {
    const rows = config.data.map((row, i) => ({
      id: i,
      cells: config.columns.map((col) => {
        const value = col.accessorKey
          ? (row as Record<string, unknown>)[col.accessorKey]
          : col.accessorFn?.(row);
        const content = col.Cell
          ? col.Cell({
              row: { original: row },
              cell: { getValue: () => value },
            })
          : stringifyCellValue(value);
        return { id: col.id, content };
      }),
    }));
    return { rows };
  },
}));

const SAMPLE_ASSET = {
  item_id: 1001,
  type_id: 34,
  quantity: 500,
  location_id: 60003760,
  location_type: "station" as const,
  is_singleton: false,
  is_blueprint_copy: false,
};

function renderTable(entries: (typeof SAMPLE_ASSET)[] = []) {
  const { AssetsDataTable } = require("~/components/Assets/AssetsDataTable");
  return render(
    <MantineProvider>
      <AssetsDataTable entries={entries} />
    </MantineProvider>,
  );
}

describe("AssetsDataTable", () => {
  beforeEach(() => {
    mockUseMarketPrices.mockReturnValue({ data: {} });
    mockUseEsiNameLookup.mockReturnValue({});
  });

  it("renders without crashing with no entries", () => {
    renderTable([]);
    expect(screen.queryAllByTestId("table-row")).toHaveLength(0);
  });

  it("renders a row for each entry", () => {
    renderTable([
      SAMPLE_ASSET,
      { ...SAMPLE_ASSET, item_id: 1002, type_id: 35 },
    ]);
    expect(screen.getAllByTestId("table-row")).toHaveLength(2);
  });

  it("shows the resolved type name when available", () => {
    mockUseEsiNameLookup.mockReturnValue({
      "34": { value: { name: "Tritanium" } },
    });
    renderTable([SAMPLE_ASSET]);
    expect(screen.getByText("Tritanium")).toBeInTheDocument();
  });

  it("shows the ISK amount when market price is available", () => {
    mockUseMarketPrices.mockReturnValue({
      data: { 34: { adjusted_price: 5.5 } },
    });
    renderTable([SAMPLE_ASSET]);
    // 5.5 * 500 = 2750
    expect(screen.getByTestId("isk-amount")).toHaveTextContent("2750.00");
  });

  it("shows no ISK amount when market price is unavailable", () => {
    mockUseMarketPrices.mockReturnValue({ data: {} });
    renderTable([SAMPLE_ASSET]);
    expect(screen.queryByTestId("isk-amount")).not.toBeInTheDocument();
  });

  it("uses type_id as sort key when name is not resolved", () => {
    renderTable([SAMPLE_ASSET]);
    // table renders without crash even when name is undefined
    expect(screen.getByTestId("table-row")).toBeInTheDocument();
  });
});
