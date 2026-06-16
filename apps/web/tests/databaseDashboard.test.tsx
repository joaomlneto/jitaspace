import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";

// Type-only import: erased at compile time, so it does not defeat the
// jest.mock below the way a value import of the component would.
import type * as DatabaseDashboardModule from "../components/Status/DatabaseDashboard";
import type { DatabaseStatusResponse } from "~/lib/databaseStatus";

const mockGetDatabaseStatus = jest.fn<() => Promise<DatabaseStatusResponse>>();

// The dashboard gets its data from a server function; stub it. jest.mock is not
// hoisted above static imports in this setup, so the component under test is
// require()d lazily inside renderDashboard, like statusPage.test.tsx does.
jest.mock("~/app/status/actions", () => ({
  getDatabaseStatus: () => mockGetDatabaseStatus(),
}));

const statusFixture: DatabaseStatusResponse = {
  fetchedAt: new Date(Date.UTC(2026, 5, 10, 12, 0, 0)).toISOString(),
  staleMinutes: 5,
  approximate: true,
  tables: [
    { name: "KillmailVictim", label: "Killmail Victim", rowCount: 1234567 },
    { name: "MarketGroup", label: "Market Group", rowCount: 50000 },
    { name: "SolarSystem", label: "Solar System", rowCount: 0 },
  ],
  totals: { tables: 3, rows: 1284567 },
};

function renderDashboard() {
  const { DatabaseDashboard } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("../components/Status/DatabaseDashboard") as typeof DatabaseDashboardModule;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <DatabaseDashboard />
      </QueryClientProvider>
    </MantineProvider>,
  );
}

describe("DatabaseDashboard", () => {
  beforeEach(() => {
    mockGetDatabaseStatus.mockReset();
  });

  it("renders table rows, counts and totals", async () => {
    mockGetDatabaseStatus.mockResolvedValue(statusFixture);

    renderDashboard();

    // Wait for data to load (the title renders even while loading). The largest
    // table's label appears both in its row and in the "Largest Table" card.
    expect(
      (await screen.findAllByText("Killmail Victim")).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Database")).toBeInTheDocument();
    expect(screen.getByText("Market Group")).toBeInTheDocument();
    // Physical table name is shown beneath the humanized label.
    expect(screen.getByText("KillmailVictim")).toBeInTheDocument();

    // Largest-table count + total records (toLocaleString) appear.
    expect(screen.getAllByText("1,234,567").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("1,284,567").length).toBeGreaterThanOrEqual(1);

    // 2 of 3 tables have records.
    expect(screen.getByText("2 with records")).toBeInTheDocument();
  });

  it("shows an empty state when no tables are reported", async () => {
    mockGetDatabaseStatus.mockResolvedValue({
      ...statusFixture,
      tables: [],
      totals: { tables: 0, rows: 0 },
    });

    renderDashboard();

    expect(
      await screen.findByText(/No tables were reported by the database/),
    ).toBeInTheDocument();
  });

  it("shows a warning when the server function reports an upstream error", async () => {
    mockGetDatabaseStatus.mockResolvedValue({
      ...statusFixture,
      error: "connection refused",
    });

    renderDashboard();

    expect(
      await screen.findByText(/Database status is currently unavailable/),
    ).toBeInTheDocument();
  });

  it("shows an error when the server function itself fails", async () => {
    mockGetDatabaseStatus.mockRejectedValue(new Error("boom"));

    renderDashboard();

    expect(
      await screen.findByText(/Failed to load database status/),
    ).toBeInTheDocument();
    expect(screen.getByText(/boom/)).toBeInTheDocument();
  });
});
