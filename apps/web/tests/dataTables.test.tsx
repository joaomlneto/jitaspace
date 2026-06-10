import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Hooks used by CompareTable
// ---------------------------------------------------------------------------
const mockUseTypes = jest.fn<() => { data: Record<number, unknown> }>();
const mockUseDogmaAttributes =
  jest.fn<() => { data: Record<number, unknown> }>();

jest.mock("@jitaspace/hooks", () => ({
  useTypes: (...args: unknown[]) => mockUseTypes(...args),
  useDogmaAttributes: (...args: unknown[]) => mockUseDogmaAttributes(...args),
}));

// ---------------------------------------------------------------------------
// @jitaspace/ui stubs (used by AgentsTable, MarketOrdersDataTable, CompareTable)
// ---------------------------------------------------------------------------
jest.mock("@jitaspace/ui", () => ({
  DateHoverCard: ({ children }: { children?: ReactNode }) => <>{children}</>,
  CharacterAnchor: ({ children }: { children?: ReactNode }) => (
    <span data-testid="char-anchor">{children}</span>
  ),
  CharacterAvatar: ({ characterId }: { characterId?: number }) => (
    <span data-testid="char-avatar">{`char-avatar-${characterId ?? "?"}`}</span>
  ),
  CharacterName: ({ characterId }: { characterId?: number }) => (
    <span data-testid="char-name">{`char-${characterId ?? "?"}`}</span>
  ),
  CorporationAnchor: ({ children }: { children?: ReactNode }) => (
    <span data-testid="corp-anchor">{children}</span>
  ),
  CorporationAvatar: ({ corporationId }: { corporationId?: number }) => (
    <span data-testid="corp-avatar">{`corp-avatar-${corporationId ?? "?"}`}</span>
  ),
  CorporationName: ({ corporationId }: { corporationId?: number }) => (
    <span data-testid="corp-name">{`corp-${corporationId ?? "?"}`}</span>
  ),
  StationAnchor: ({ children }: { children?: ReactNode }) => (
    <span data-testid="station-anchor">{children}</span>
  ),
  StationName: ({ stationId }: { stationId?: number }) => (
    <span data-testid="station-name">{`station-${stationId ?? "?"}`}</span>
  ),
  EveEntityAnchor: ({ children }: { children?: ReactNode }) => (
    <span data-testid="entity-anchor">{children}</span>
  ),
  EveEntityName: ({ entityId }: { entityId?: number }) => (
    <span data-testid="entity-name">{`entity-${entityId ?? "?"}`}</span>
  ),
  TimeAgoText: ({ date }: { date: Date }) => (
    <span data-testid="time-ago">{date.toISOString()}</span>
  ),
  DogmaAttributeAnchor: ({ children }: { children?: ReactNode }) => (
    <span data-testid="attr-anchor">{children}</span>
  ),
  TypeAnchor: ({ children }: { children?: ReactNode }) => (
    <span data-testid="type-anchor">{children}</span>
  ),
  TypeAvatar: ({ typeId }: { typeId?: number }) => (
    <span data-testid="type-avatar">{`type-avatar-${typeId ?? "?"}`}</span>
  ),
  TypeName: ({ typeId }: { typeId?: number }) => (
    <span data-testid="type-name">{`type-${typeId ?? "?"}`}</span>
  ),
}));

// ---------------------------------------------------------------------------
// ~/components stubs
// ---------------------------------------------------------------------------
jest.mock("~/components/Avatar", () => ({
  StationAvatar: ({ stationId }: { stationId?: number }) => (
    <span data-testid="station-avatar">{`station-avatar-${stationId ?? "?"}`}</span>
  ),
}));

jest.mock("~/components/Badge", () => ({
  SolarSystemSecurityStatusBadge: ({
    solarSystemId,
  }: {
    solarSystemId?: number | string;
  }) => <span data-testid="sec-badge">{`sec-${solarSystemId ?? "?"}`}</span>,
}));

jest.mock("~/components/Text", () => ({
  DogmaAttributeName: ({ attributeId }: { attributeId?: number }) => (
    <span data-testid="attr-name">{`attr-${attributeId ?? "?"}`}</span>
  ),
}));

// ---------------------------------------------------------------------------
// mantine-react-table mock: renders one row per data entry, invoking each
// column's Cell renderer with row.original / cell.getValue / renderedCellValue.
// ---------------------------------------------------------------------------
type Col = {
  id: string;
  header?: string;
  accessorKey?: string;
  accessorFn?: (row: unknown) => unknown;
  Cell?: (args: {
    renderedCellValue: ReactNode;
    row: { original: unknown };
    cell: { getValue: <T>() => T };
  }) => ReactNode;
};

jest.mock("mantine-react-table", () => ({
  MantineReactTable: ({
    table,
  }: {
    table: { columns: Col[]; data: unknown[] };
  }) => (
    <table>
      <thead>
        <tr>
          {table.columns.map((col) => (
            <th key={col.id}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.data.map((row, i) => (
          <tr key={i} data-testid="table-row">
            {table.columns.map((col) => {
              const value = col.accessorKey
                ? (row as Record<string, unknown>)[col.accessorKey]
                : col.accessorFn?.(row);
              const content = col.Cell
                ? col.Cell({
                    renderedCellValue: String(value ?? ""),
                    row: { original: row },
                    cell: { getValue: <T,>() => value as T },
                  })
                : String(value ?? "");
              return <td key={col.id}>{content}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  ),
  // Simply pass the config through; the MantineReactTable mock reads from it.
  useMantineReactTable: (config: { columns: Col[]; data: unknown[] }) => config,
}));

function renderWithMantine(ui: ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

// ===========================================================================
// AgentsTable
// ===========================================================================
describe("AgentsTable", () => {
  const SAMPLE_AGENT = {
    characterId: 3000001,
    name: "Test Agent",
    corporationId: 1000001,
    agentTypeId: 2,
    agentDivisionId: 22,
    isLocator: true,
    level: 4,
    stationId: 60000001,
  };

  const agentTypes = [{ name: "Basic Agent", agentTypeId: 2 }];
  const agentDivisions = [{ name: "Security", npcCorporationDivisionId: 22 }];

  function renderAgents(agents = [SAMPLE_AGENT]) {
    const { AgentsTable } = require("~/components/Agents/AgentsTable");
    return renderWithMantine(
      <AgentsTable
        agents={agents}
        agentTypes={agentTypes}
        agentDivisions={agentDivisions}
      />,
    );
  }

  it("renders without crashing with no agents", () => {
    renderAgents([]);
    expect(screen.queryAllByTestId("table-row")).toHaveLength(0);
  });

  it("renders a row per agent", () => {
    renderAgents([SAMPLE_AGENT, { ...SAMPLE_AGENT, characterId: 3000002 }]);
    expect(screen.getAllByTestId("table-row")).toHaveLength(2);
  });

  it("renders the agent name column with character avatar/anchor/name", () => {
    renderAgents();
    expect(screen.getByText("char-avatar-3000001")).toBeInTheDocument();
    expect(screen.getByText("char-3000001")).toBeInTheDocument();
  });

  it("renders the corporation column", () => {
    renderAgents();
    expect(screen.getByText("corp-avatar-1000001")).toBeInTheDocument();
    expect(screen.getByText("corp-1000001")).toBeInTheDocument();
  });

  it("resolves the agent type name from agentTypes", () => {
    renderAgents();
    expect(screen.getByText("Basic Agent")).toBeInTheDocument();
  });

  it("resolves the division name from agentDivisions", () => {
    renderAgents();
    expect(screen.getByText("Security")).toBeInTheDocument();
  });

  it("renders Yes when the agent is a locator", () => {
    renderAgents([{ ...SAMPLE_AGENT, isLocator: true }]);
    expect(screen.getByText("Yes")).toBeInTheDocument();
  });

  it("renders No when the agent is not a locator", () => {
    renderAgents([{ ...SAMPLE_AGENT, isLocator: false }]);
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("renders the location column with station avatar/anchor/name", () => {
    renderAgents();
    expect(screen.getByText("station-avatar-60000001")).toBeInTheDocument();
    expect(screen.getByText("station-60000001")).toBeInTheDocument();
  });

  it("falls back to Unknown for a division with no name", () => {
    const { AgentsTable } = require("~/components/Agents/AgentsTable");
    renderWithMantine(
      <AgentsTable
        agents={[{ ...SAMPLE_AGENT, agentDivisionId: 99 }]}
        agentTypes={agentTypes}
        agentDivisions={[
          { name: undefined as unknown as string, npcCorporationDivisionId: 99 },
        ]}
      />,
    );
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });
});

// ===========================================================================
// MarketOrdersDataTable
// ===========================================================================
describe("MarketOrdersDataTable", () => {
  const SAMPLE_ORDER = {
    order_id: 1234567890,
    volume_remain: 1500,
    price: 9999.5,
    location_id: 60003760,
    system_id: 30000142,
    duration: 90,
    range: "region",
    issued: "2024-01-01T00:00:00Z",
  };

  function renderOrders(orders = [SAMPLE_ORDER], sortPriceDescending = false) {
    const {
      MarketOrdersDataTable,
    } = require("~/components/Market/MarketOrdersDataTable");
    return renderWithMantine(
      <MarketOrdersDataTable
        orders={orders}
        sortPriceDescending={sortPriceDescending}
      />,
    );
  }

  it("renders without crashing with no orders", () => {
    renderOrders([]);
    expect(screen.queryAllByTestId("table-row")).toHaveLength(0);
  });

  it("renders a row per order", () => {
    renderOrders([SAMPLE_ORDER, { ...SAMPLE_ORDER, order_id: 2 }]);
    expect(screen.getAllByTestId("table-row")).toHaveLength(2);
  });

  it("formats the remaining volume with locale separators", () => {
    renderOrders();
    expect(screen.getByText("1,500")).toBeInTheDocument();
  });

  it("formats the price with an ISK suffix", () => {
    renderOrders();
    expect(screen.getByText("9,999.5 ISK")).toBeInTheDocument();
  });

  it("renders the location column with the security badge and entity name", () => {
    renderOrders();
    expect(screen.getByText("sec-30000142")).toBeInTheDocument();
    expect(screen.getByText("entity-60003760")).toBeInTheDocument();
  });

  it("renders the issued time", () => {
    renderOrders();
    expect(screen.getAllByTestId("time-ago").length).toBeGreaterThanOrEqual(1);
  });

  it("renders both issued and expires time columns", () => {
    renderOrders();
    // issued + expires both render TimeAgoText
    expect(screen.getAllByTestId("time-ago")).toHaveLength(2);
  });

  it("accepts sortPriceDescending without crashing", () => {
    renderOrders([SAMPLE_ORDER], true);
    expect(screen.getByText("9,999.5 ISK")).toBeInTheDocument();
  });
});

// ===========================================================================
// CompareTable
// ===========================================================================
describe("CompareTable", () => {
  beforeEach(() => {
    mockUseTypes.mockReset();
    mockUseDogmaAttributes.mockReset();
    mockUseTypes.mockReturnValue({ data: {} });
    mockUseDogmaAttributes.mockReturnValue({ data: {} });
  });

  function renderCompare(typeIds = [587, 588]) {
    const { CompareTable } = require("~/components/Compare/CompareTable");
    return renderWithMantine(<CompareTable typeIds={typeIds} />);
  }

  it("renders without crashing when there are no types", () => {
    renderCompare([]);
    expect(screen.getByText("Attribute")).toBeInTheDocument();
  });

  it("renders a column header per type, sorted alphabetically by name", () => {
    mockUseTypes.mockReturnValue({
      data: {
        587: { type_id: 587, name: "Rifter", dogma_attributes: [] },
        588: { type_id: 588, name: "Atron", dogma_attributes: [] },
      },
    });
    renderCompare();
    expect(screen.getByText("type-587")).toBeInTheDocument();
    expect(screen.getByText("type-588")).toBeInTheDocument();
    expect(screen.getByText("type-avatar-587")).toBeInTheDocument();
  });

  it("renders rows for attributes whose values differ between types", () => {
    mockUseTypes.mockReturnValue({
      data: {
        587: {
          type_id: 587,
          name: "Rifter",
          dogma_attributes: [{ attribute_id: 4, value: 100 }],
        },
        588: {
          type_id: 588,
          name: "Atron",
          dogma_attributes: [{ attribute_id: 4, value: 200 }],
        },
      },
    });
    mockUseDogmaAttributes.mockReturnValue({
      data: {
        4: { attribute_id: 4, name: "mass", display_name: "Mass" },
      },
    });
    renderCompare();
    // The differing attribute should produce a row with the attribute name
    expect(screen.getByText("attr-4")).toBeInTheDocument();
    // and the two differing values
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument();
  });

  it("does not render rows for attributes whose values are equal", () => {
    mockUseTypes.mockReturnValue({
      data: {
        587: {
          type_id: 587,
          name: "Rifter",
          dogma_attributes: [{ attribute_id: 4, value: 100 }],
        },
        588: {
          type_id: 588,
          name: "Atron",
          dogma_attributes: [{ attribute_id: 4, value: 100 }],
        },
      },
    });
    // Equal values -> nonEqualAttributeIds empty -> useDogmaAttributes called with []
    mockUseDogmaAttributes.mockReturnValue({ data: {} });
    renderCompare();
    expect(screen.queryByText("attr-4")).not.toBeInTheDocument();
  });

  it("sorts attributes by display_name", () => {
    mockUseTypes.mockReturnValue({
      data: {
        587: {
          type_id: 587,
          name: "Rifter",
          dogma_attributes: [
            { attribute_id: 4, value: 100 },
            { attribute_id: 9, value: 50 },
          ],
        },
        588: {
          type_id: 588,
          name: "Atron",
          dogma_attributes: [
            { attribute_id: 4, value: 200 },
            { attribute_id: 9, value: 75 },
          ],
        },
      },
    });
    mockUseDogmaAttributes.mockReturnValue({
      data: {
        4: { attribute_id: 4, name: "mass", display_name: "Zeta" },
        9: { attribute_id: 9, name: "hp", display_name: "Alpha" },
      },
    });
    renderCompare();
    expect(screen.getByText("attr-4")).toBeInTheDocument();
    expect(screen.getByText("attr-9")).toBeInTheDocument();
  });

  it("renders the JSON debug inputs", () => {
    mockUseTypes.mockReturnValue({
      data: {
        587: { type_id: 587, name: "Rifter", dogma_attributes: [] },
      },
    });
    renderCompare([587]);
    expect(
      screen.getByText("Types, sorted alphabetically by name"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Attribute Ids (whose values differ between at least two of the Types)",
      ),
    ).toBeInTheDocument();
  });

  it("handles types that have no dogma_attributes field at all", () => {
    // Exercises the `dogma_attributes ?? []` fallback branches.
    mockUseTypes.mockReturnValue({
      data: {
        587: { type_id: 587, name: "Rifter" },
        588: { type_id: 588, name: "Atron" },
      },
    });
    mockUseDogmaAttributes.mockReturnValue({ data: {} });
    renderCompare();
    expect(screen.getByText("type-587")).toBeInTheDocument();
    expect(screen.getByText("type-588")).toBeInTheDocument();
  });

  it("sorts attributes by name/id when display_name is missing", () => {
    mockUseTypes.mockReturnValue({
      data: {
        587: {
          type_id: 587,
          name: "Rifter",
          dogma_attributes: [{ attribute_id: 4, value: 100 }],
        },
        588: {
          type_id: 588,
          name: "Atron",
          dogma_attributes: [{ attribute_id: 4, value: 200 }],
        },
      },
    });
    // Attribute has neither display_name nor name -> falls back to id string.
    mockUseDogmaAttributes.mockReturnValue({
      data: {
        4: { attribute_id: 4 },
      },
    });
    renderCompare();
    expect(screen.getByText("attr-4")).toBeInTheDocument();
  });

  it("sorts a mix of attributes with display_name, name-only and id-only", () => {
    mockUseTypes.mockReturnValue({
      data: {
        587: {
          type_id: 587,
          name: "Rifter",
          dogma_attributes: [
            { attribute_id: 4, value: 100 },
            { attribute_id: 9, value: 50 },
            { attribute_id: 12, value: 1 },
          ],
        },
        588: {
          type_id: 588,
          name: "Atron",
          dogma_attributes: [
            { attribute_id: 4, value: 200 },
            { attribute_id: 9, value: 75 },
            { attribute_id: 12, value: 2 },
          ],
        },
      },
    });
    // 4 has display_name, 9 has only name, 12 has only id -> exercises both
    // sides of the `display_name ?? name ?? id` comparator chain.
    mockUseDogmaAttributes.mockReturnValue({
      data: {
        4: { attribute_id: 4, name: "mass", display_name: "Mass" },
        9: { attribute_id: 9, name: "hp" },
        12: { attribute_id: 12 },
      },
    });
    renderCompare();
    expect(screen.getByText("attr-4")).toBeInTheDocument();
    expect(screen.getByText("attr-9")).toBeInTheDocument();
    expect(screen.getByText("attr-12")).toBeInTheDocument();
  });

  it("renders an empty value cell for a type missing the differing attribute", () => {
    // 588 has no dogma_attributes at all, but 587 does -> the value differs
    // (200 vs undefined) so a row renders, exercising the `?? []` fallback in
    // the per-type value cell for 588.
    mockUseTypes.mockReturnValue({
      data: {
        587: {
          type_id: 587,
          name: "Rifter",
          dogma_attributes: [{ attribute_id: 4, value: 200 }],
        },
        588: {
          type_id: 588,
          name: "Atron",
        },
      },
    });
    mockUseDogmaAttributes.mockReturnValue({
      data: {
        4: { attribute_id: 4, name: "mass", display_name: "Mass" },
      },
    });
    renderCompare();
    expect(screen.getByText("attr-4")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument();
  });
});
