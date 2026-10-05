import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";

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

function renderWithMantine(ui: ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

/** The rendered data rows: body rows, minus the empty-state row. */
const dataRows = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .filter((row) => !row.textContent.includes("No data"));

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
    expect(dataRows()).toHaveLength(0);
  });

  it("renders a row per agent", () => {
    renderAgents([SAMPLE_AGENT, { ...SAMPLE_AGENT, characterId: 3000002 }]);
    expect(dataRows()).toHaveLength(2);
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
    expect(dataRows()).toHaveLength(0);
  });

  it("renders a row per order", () => {
    renderOrders([SAMPLE_ORDER, { ...SAMPLE_ORDER, order_id: 2 }]);
    expect(dataRows()).toHaveLength(2);
  });

  it("formats the remaining volume with locale separators", () => {
    renderOrders();
    expect(screen.getByText("1,500")).toBeInTheDocument();
  });

  it("formats the price with two decimals and an ISK suffix", () => {
    renderOrders();
    expect(screen.getByText("9,999.50 ISK")).toBeInTheDocument();
  });

  it("spells out the duration and the range", () => {
    renderOrders([
      SAMPLE_ORDER,
      { ...SAMPLE_ORDER, order_id: 2, range: "solarsystem" },
      { ...SAMPLE_ORDER, order_id: 3, range: "5" },
    ]);
    expect(screen.getAllByText("90 days")).toHaveLength(3);
    expect(screen.getByText("Region")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
    expect(screen.getByText("5 jumps")).toBeInTheDocument();
  });

  it("searches and sorts ranges as they read, not as ESI spells them", () => {
    renderOrders([
      { ...SAMPLE_ORDER, order_id: 1, range: "region" },
      { ...SAMPLE_ORDER, order_id: 2, range: "solarsystem" },
      { ...SAMPLE_ORDER, order_id: 3, range: "10" },
      { ...SAMPLE_ORDER, order_id: 4, range: "2" },
    ]);

    fireEvent.click(screen.getByText("Range"));
    expect(dataRows().map((row) => row.textContent)).toEqual([
      expect.stringContaining("System"),
      expect.stringContaining("2 jumps"),
      expect.stringContaining("10 jumps"),
      expect.stringContaining("Region"),
    ]);

    fireEvent.change(screen.getByPlaceholderText("Search..."), {
      target: { value: "jumps" },
    });
    expect(dataRows()).toHaveLength(2);
  });

  it("sorts a range ESI adds later after every known one, either way", () => {
    renderOrders([
      { ...SAMPLE_ORDER, order_id: 1, range: "constellation" },
      { ...SAMPLE_ORDER, order_id: 2, range: "region" },
      { ...SAMPLE_ORDER, order_id: 3, range: "2" },
    ]);
    const ranges = () =>
      dataRows().map((row) =>
        ["constellation", "Region", "2 jumps"].find((label) =>
          row.textContent.includes(label),
        ),
      );

    fireEvent.click(screen.getByText("Range"));
    expect(ranges()).toEqual(["2 jumps", "Region", "constellation"]);
    fireEvent.click(screen.getByText("Range"));
    expect(ranges()).toEqual(["Region", "2 jumps", "constellation"]);
  });

  it("expires an order after its own duration, not a fixed 30 days", () => {
    renderOrders([{ ...SAMPLE_ORDER, duration: 3 }]);
    const [issued, expires] = screen
      .getAllByTestId("time-ago")
      .map((element) => element.textContent);
    expect(issued).toBe("2024-01-01T00:00:00.000Z");
    expect(expires).toBe("2024-01-04T00:00:00.000Z");
  });

  it("renders the location column with the security badge and entity name", () => {
    renderOrders();
    expect(screen.getByText("sec-30000142")).toBeInTheDocument();
    expect(screen.getByText("entity-60003760")).toBeInTheDocument();
  });

  it("names a structure by its system, without looking its id up", () => {
    // ESI's /universe/names 400s on an id beyond int32, and structure names
    // need an authorised character, so the cell never asks for one.
    renderOrders([{ ...SAMPLE_ORDER, location_id: 1_044_752_365_771 }]);

    expect(screen.getByText(/Structure in/)).toBeInTheDocument();
    expect(screen.getByText("entity-30000142")).toBeInTheDocument();
    expect(screen.queryByText("entity-1044752365771")).not.toBeInTheDocument();
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
    expect(screen.getByText("9,999.50 ISK")).toBeInTheDocument();
  });
});
