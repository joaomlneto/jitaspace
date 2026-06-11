import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";

// Type-only import: erased at compile time, so it does not defeat the
// jest.mock below the way a value import of the component would.
import type * as InngestJobsDashboardModule from "../components/Status/InngestJobsDashboard";
import type { InngestStatusResponse } from "~/lib/inngestStatus";

const mockGetInngestStatus = jest.fn<() => Promise<InngestStatusResponse>>();

// The dashboard gets its data from a server function; stub it. The real
// @jitaspace/ui pulls in ESM-only dependencies jest can't parse, and
// TimeAgoText re-renders on a 1s interval; stub it too. Note jest.mock is not
// hoisted above static imports in this setup, so the component under test is
// require()d lazily inside renderDashboard, like statusPage.test.tsx does.
jest.mock("~/app/status/actions", () => ({
  getInngestStatus: () => mockGetInngestStatus(),
}));

jest.mock("@jitaspace/ui", () => ({
  TimeAgoText: ({ date }: { date: Date }) => (
    <span>{`ago:${date.toISOString()}`}</span>
  ),
}));

const NOW = Date.UTC(2026, 5, 10, 12, 0, 0);

const statusFixture: InngestStatusResponse = {
  fetchedAt: new Date(NOW).toISOString(),
  windowHours: 24,
  jobs: [
    {
      id: "jitaspace-scrape-esi-alliances",
      name: "Scrape ESI Alliances",
      lastRun: {
        runId: "RUN-COMPLETED",
        status: "Completed",
        queuedAt: NOW - 600_000,
        endedAt: NOW - 300_000,
        durationMs: 300_000,
      },
      counts: { completed: 3, failed: 0, cancelled: 0, total: 3 },
      recentRuns: [
        {
          runId: "RUN-COMPLETED",
          status: "Completed",
          queuedAt: NOW - 600_000,
          endedAt: NOW - 300_000,
          durationMs: 300_000,
        },
      ],
    },
    {
      id: "jitaspace-esi-update-wars",
      name: "ESI Update Wars",
      lastRun: {
        runId: "RUN-FAILED",
        status: "Failed",
        queuedAt: NOW - 7_200_000,
        endedAt: NOW - 7_100_000,
        durationMs: 100_000,
        errorName: "Error",
        errorMessage: "ESI exploded",
      },
      counts: { completed: 22, failed: 2, cancelled: 0, total: 24 },
      recentRuns: [
        {
          runId: "RUN-FAILED",
          status: "Failed",
          queuedAt: NOW - 7_200_000,
          endedAt: NOW - 7_100_000,
          durationMs: 100_000,
          errorName: "Error",
          errorMessage: "ESI exploded",
        },
      ],
    },
  ],
  totals: {
    jobs: 2,
    runs: 27,
    completed: 25,
    failed: 2,
    cancelled: 0,
  },
};

function renderDashboard() {
  const { InngestJobsDashboard } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("../components/Status/InngestJobsDashboard") as typeof InngestJobsDashboardModule;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <InngestJobsDashboard />
      </QueryClientProvider>
    </MantineProvider>,
  );
}

describe("InngestJobsDashboard", () => {
  beforeEach(() => {
    mockGetInngestStatus.mockReset();
  });

  it("renders job rows, statuses and totals", async () => {
    mockGetInngestStatus.mockResolvedValue(statusFixture);

    renderDashboard();

    expect(await screen.findByText("Scrape ESI Alliances")).toBeInTheDocument();
    expect(screen.getByText("ESI Update Wars")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();

    // 2 failed runs in window -> red overall badge + failed-run counter.
    expect(screen.getByText("2 Failed Runs")).toBeInTheDocument();
    expect(screen.getByText("(2 failed)")).toBeInTheDocument();

    // Function slugs are shown under the derived job names.
    expect(
      screen.getByText("jitaspace-scrape-esi-alliances"),
    ).toBeInTheDocument();
    expect(screen.getByText("jitaspace-esi-update-wars")).toBeInTheDocument();
  });

  it("shows an empty state when there are no runs in the window", async () => {
    mockGetInngestStatus.mockResolvedValue({
      ...statusFixture,
      jobs: [],
      totals: { jobs: 0, runs: 0, completed: 0, failed: 0, cancelled: 0 },
    });

    renderDashboard();

    expect(
      await screen.findByText(/No job runs in the last 24 hours/),
    ).toBeInTheDocument();
    expect(screen.getByText("No Recent Runs")).toBeInTheDocument();
  });

  it("shows a warning when the server function reports an upstream error", async () => {
    mockGetInngestStatus.mockResolvedValue({
      ...statusFixture,
      error: "Inngest API responded with 500",
    });

    renderDashboard();

    expect(
      await screen.findByText(/Background job status is currently unavailable/),
    ).toBeInTheDocument();
  });

  it("shows an error when the server function itself fails", async () => {
    mockGetInngestStatus.mockRejectedValue(new Error("connection lost"));

    renderDashboard();

    expect(
      await screen.findByText(/Failed to load background job status/),
    ).toBeInTheDocument();
    expect(screen.getByText(/connection lost/)).toBeInTheDocument();
  });
});
