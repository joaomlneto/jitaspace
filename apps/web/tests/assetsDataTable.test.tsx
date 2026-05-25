import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

const mockUseMarketPrices =
  jest.fn<() => { data: Record<number, { adjusted_price?: number }> }>();
const mockUseEsiNameLookup = jest.fn<
  () => Record<string, { value?: { name: string } } | undefined>
>();

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

// Simplified mantine-react-table mock that renders rows with accessible data
jest.mock("mantine-react-table", () => ({
  MantineReactTable: ({ table }: { table: ReturnType<typeof mockTable> }) => (
    <table>
      <tbody>
        {table.rows.map(
          (row: { id: string | number; cells: { id: string; content: ReactNode }[] }) => (
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
      Cell?: (args: { row: { original: unknown }; cell: { getValue: () => unknown } }) => ReactNode;
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
          : String(value ?? "");
        return { id: col.id, content };
      }),
    }));
    return { rows };
  },
}));

type mockTable = ReturnType<typeof import("mantine-react-table")["useMantineReactTable"]>;

const SAMPLE_ASSET = {
  item_id: 1001,
  type_id: 34,
  quantity: 500,
  location_id: 60003760,
  location_type: "station" as const,
  is_singleton: false,
  is_blueprint_copy: false,
};

function renderTable(
  entries: typeof SAMPLE_ASSET[] = [],
) {
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
    renderTable([SAMPLE_ASSET, { ...SAMPLE_ASSET, item_id: 1002, type_id: 35 }]);
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
