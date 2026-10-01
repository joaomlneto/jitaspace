import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { describe, expect, it, jest } from "@jest/globals";
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

// ---------------------------------------------------------------------------
// @jitaspace/ui stubs (used by AgentsTable and MarketOrdersDataTable)
// ---------------------------------------------------------------------------
jest.mock("@jitaspace/ui", () => ({
  DateHoverCard: ({ children }: { children?: ReactNode }) => <>{children}</>,
  CharacterAvatar: ({ characterId }: { characterId?: number }) => (
    <span data-testid="char-avatar">{`char-avatar-${characterId ?? "?"}`}</span>
  ),
  CorporationAnchor: ({ children }: { children?: ReactNode }) => (
    <span data-testid="corp-anchor">{children}</span>
  ),
  CorporationAvatar: ({ corporationId }: { corporationId?: number }) => (
    <span data-testid="corp-avatar">{`corp-avatar-${corporationId ?? "?"}`}</span>
  ),
  TimeAgoText: ({ date }: { date: Date }) => (
    <span data-testid="time-ago">{date.toISOString()}</span>
  ),
}));

// Components that moved to @jitaspace/eve-components are stubbed there.
jest.mock("@jitaspace/eve-components", () => ({
  TypeAvatar: ({ typeId }: { typeId?: number }) => (
    <span data-testid="type-avatar">{`type-avatar-${typeId ?? "?"}`}</span>
  ),
  CharacterAnchor: ({ children }: { children?: ReactNode }) => (
    <span data-testid="char-anchor">{children}</span>
  ),
  CharacterName: ({ characterId }: { characterId?: number }) => (
    <span data-testid="char-name">{`char-${characterId ?? "?"}`}</span>
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
  TypeAnchor: ({ children }: { children?: ReactNode }) => (
    <span data-testid="type-anchor">{children}</span>
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

// ---------------------------------------------------------------------------
// mantine-react-table mock: renders one row per data entry, invoking each
// column's Cell renderer with row.original / cell.getValue / renderedCellValue.
// ---------------------------------------------------------------------------
interface Col {
  id: string;
  header?: string;
  accessorKey?: string;
  accessorFn?: (row: unknown) => unknown;
  Cell?: (args: {
    renderedCellValue: ReactNode;
    row: { original: unknown };
    cell: { getValue: <T>() => T };
  }) => ReactNode;
}

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
                    renderedCellValue: stringifyCellValue(value),
                    row: { original: row },
                    cell: { getValue: <T,>() => value as T },
                  })
                : stringifyCellValue(value);
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
          {
            name: undefined as unknown as string,
            npcCorporationDivisionId: 99,
          },
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
