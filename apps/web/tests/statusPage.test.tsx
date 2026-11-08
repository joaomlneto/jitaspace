import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";

// ---------------------------------------------------------------------------
// The status page pulls hooks from three different generated/client packages:
//   - @jitaspace/esi-client  (getRateLimitBuildDate, useGetMetaCompatibilityDates, useGetMetaStatus)
//   - @jitaspace/hooks       (useServerStatus)
// Each is mocked independently so every conditional section renders.
// ---------------------------------------------------------------------------

const mockGetRateLimitBuildDate = jest.fn<() => string | undefined>();
const mockUseGetMetaCompatibilityDates = jest.fn();
const mockUseGetMetaStatus = jest.fn();
const mockUseServerStatus = jest.fn();

jest.mock("@jitaspace/esi-client", () => ({
  getRateLimitBuildDate: () => mockGetRateLimitBuildDate(),
  useGetMetaCompatibilityDates: () => mockUseGetMetaCompatibilityDates(),
  useGetMetaStatus: (...args: unknown[]) => mockUseGetMetaStatus(...args),
}));

jest.mock("@jitaspace/hooks", () => ({
  useServerStatus: () => mockUseServerStatus(),
}));

jest.mock("@jitaspace/ui", () => ({
  DateHoverCard: ({ children }: { children?: ReactNode }) => <>{children}</>,
  FormattedDateText: ({ date }: { date?: Date }) => (
    <span>{date ? `Date ${date.toISOString()}` : "No date"}</span>
  ),
}));

let mockModifiedDate: string | undefined = "2025-05-01T00:00:00Z";
jest.mock("~/env", () => ({
  env: {
    get NEXT_PUBLIC_MODIFIED_DATE() {
      return mockModifiedDate;
    },
  },
}));

jest.mock("../components/Status/EsiRateLimitDashboard", () => ({
  EsiRateLimitDashboard: () => <div>Rate Limit Dashboard</div>,
}));

jest.mock("../components/Status/EsiStatusDashboard", () => ({
  EsiStatusDashboard: () => <div>ESI Status Dashboard</div>,
}));

jest.mock("../components/Status/TriggerJobsDashboard", () => ({
  TriggerJobsDashboard: () => <div>Trigger Jobs Dashboard</div>,
}));

jest.mock("../components/Status/DatabaseDashboard", () => ({
  DatabaseDashboard: () => <div>Database Dashboard</div>,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
  }: {
    href?: string | object;
    children?: ReactNode;
  }) => <a href={typeof href === "string" ? href : ""}>{children}</a>,
}));

function renderPage(props?: {
  vercelStatusData?: unknown;
  sdeLastModifiedData?: unknown;
  /** The SDE build our database holds, from the ingest marker in Redis. */
  sdeIngestState?: { buildNumber: number; completedAt: string | null } | null;
  /** Query string the page is opened with, e.g. `?tab=database`. */
  searchParams?: string;
}) {
  const StatusPage = require("~/app/status/page.client").default;
  return render(
    <MantineProvider>
      <StatusPage
        vercelStatusData={props?.vercelStatusData ?? null}
        sdeLastModifiedData={props?.sdeLastModifiedData ?? null}
        sdeIngestState={props?.sdeIngestState ?? null}
      />
    </MantineProvider>,
    {
      wrapper: withNuqsTestingAdapter({
        searchParams: props?.searchParams ?? "",
        hasMemory: true,
      }),
    },
  );
}

describe("Status Page", () => {
  beforeEach(() => {
    mockGetRateLimitBuildDate.mockReset();
    mockUseGetMetaCompatibilityDates.mockReset();
    mockUseGetMetaStatus.mockReset();
    mockUseServerStatus.mockReset();
    mockModifiedDate = "2025-05-01T00:00:00Z";
  });

  it("renders all sections with rich data (up-to-date compatibility + SDE, online TQ, operational ESI)", () => {
    // Build date >= latest compatibility date -> up-to-date branch
    mockGetRateLimitBuildDate.mockReturnValue("2025-12-16");
    mockUseGetMetaCompatibilityDates.mockReturnValue({
      data: {
        data: {
          compatibility_dates: ["2025-01-01", "2025-12-16", "2025-06-01"],
        },
      },
    });
    mockUseGetMetaStatus.mockReturnValue({
      data: {
        data: {
          routes: [
            { route: "/a", status: "OK" },
            { route: "/b", status: "OK" },
          ],
        },
      },
    });
    mockUseServerStatus.mockReturnValue({
      data: {
        data: {
          players: 31234,
          server_version: "2401234",
          start_time: "2025-05-30T11:00:00Z",
          vip: true,
        },
      },
    });
    renderPage({
      vercelStatusData: { status: { description: "Vercel Operational" } },
      sdeLastModifiedData: {
        releaseDate: "2025-05-27T00:00:00Z",
        buildNumber: 3383521,
      },
      // Holding CCP's latest build -> up-to-date branch.
      sdeIngestState: {
        buildNumber: 3383521,
        completedAt: "2025-05-29T00:00:00Z",
      },
    });

    expect(screen.getByText("Server Status")).toBeInTheDocument();
    expect(screen.getByText("JitaSpace")).toBeInTheDocument();
    expect(screen.getByText("Tranquility")).toBeInTheDocument();
    expect(screen.getByText("ESI API")).toBeInTheDocument();

    // Vercel description from props
    expect(
      screen.getByRole("link", { name: "Vercel Operational" }),
    ).toBeInTheDocument();

    // Build date is shown
    expect(screen.getByText("2025-12-16")).toBeInTheDocument();

    // TQ online + VIP + players formatted
    expect(screen.getByText("Online")).toBeInTheDocument();
    expect(screen.getByText("VIP Mode")).toBeInTheDocument();
    expect(screen.getByText("31,234")).toBeInTheDocument();
    expect(screen.getByText("2401234")).toBeInTheDocument();

    // ESI all operational -> "None" degraded endpoints
    expect(screen.getByText("All Systems Operational")).toBeInTheDocument();
    expect(screen.getByText("None")).toBeInTheDocument();

    // Only the default (ESI Client) tab's dashboard is mounted
    expect(screen.getByText("Rate Limit Dashboard")).toBeInTheDocument();
    expect(
      screen.queryByText("Trigger Jobs Dashboard"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Database Dashboard")).not.toBeInTheDocument();
  });

  it("renders outdated branches and partial ESI degradation", () => {
    // Build date < latest compatibility date -> outdated branch
    mockGetRateLimitBuildDate.mockReturnValue("2025-01-01");
    mockUseGetMetaCompatibilityDates.mockReturnValue({
      data: { data: { compatibility_dates: ["2025-12-16"] } },
    });
    mockUseGetMetaStatus.mockReturnValue({
      data: {
        data: {
          routes: [
            { route: "/a", status: "OK" },
            { route: "/b", status: "red" },
            { route: "/c", status: "yellow" },
          ],
        },
      },
    });
    mockUseServerStatus.mockReturnValue({
      data: {
        data: {
          players: 100,
          server_version: "v1",
          start_time: "2025-05-30T11:00:00Z",
          vip: false,
        },
      },
    });
    renderPage({
      vercelStatusData: { status: { description: "Degraded" } },
      sdeLastModifiedData: {
        releaseDate: "2025-05-27T00:00:00Z",
        buildNumber: 3383521,
      },
      // Holding an older build than CCP's latest -> outdated branch.
      sdeIngestState: {
        buildNumber: 3383000,
        completedAt: "2025-05-01T00:00:00Z",
      },
    });

    expect(screen.getByText("2025-01-01")).toBeInTheDocument();
    // 2 non-OK endpoints -> partial degradation
    expect(screen.getByText("Partial Degradation")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders loading / fallback state when all data is undefined", () => {
    mockModifiedDate = undefined; // webLastUpdatedDate null branch
    mockGetRateLimitBuildDate.mockReturnValue(undefined);
    mockUseGetMetaCompatibilityDates.mockReturnValue({});
    mockUseGetMetaStatus.mockReturnValue({});
    mockUseServerStatus.mockReturnValue({});

    renderPage();

    expect(screen.getByText("Server Status")).toBeInTheDocument();
    // vercelStatusData null -> Unknown
    expect(screen.getByRole("link", { name: "Unknown" })).toBeInTheDocument();
    // No build date -> "-"
    expect(screen.getAllByText("-").length).toBeGreaterThanOrEqual(1);
    // TQ offline (no status)
    expect(screen.getByText("Offline")).toBeInTheDocument();
  });

  it("handles compatibility dates present but empty array", () => {
    mockGetRateLimitBuildDate.mockReturnValue("2025-12-16");
    mockUseGetMetaCompatibilityDates.mockReturnValue({
      data: { data: { compatibility_dates: [] } },
    });
    mockUseGetMetaStatus.mockReturnValue({ data: { data: { routes: [] } } });
    mockUseServerStatus.mockReturnValue({});

    renderPage();

    // build date renders but no check/x icon because latestCompatibilityDate is null
    expect(screen.getByText("2025-12-16")).toBeInTheDocument();
    expect(screen.getByText("Server Status")).toBeInTheDocument();
  });

  describe("tabs", () => {
    beforeEach(() => {
      mockGetRateLimitBuildDate.mockReturnValue("2025-12-16");
      mockUseGetMetaCompatibilityDates.mockReturnValue({});
      mockUseGetMetaStatus.mockReturnValue({});
      mockUseServerStatus.mockReturnValue({});
    });

    it.each([
      ["?tab=esi", "Rate Limit Dashboard"],
      ["?tab=database", "Database Dashboard"],
      ["?tab=background-jobs", "Trigger Jobs Dashboard"],
      // Unknown values fall back to the default tab.
      ["?tab=bogus", "Rate Limit Dashboard"],
    ])("opens %s on %s", (searchParams, dashboard) => {
      renderPage({ searchParams });
      expect(screen.getByText(dashboard)).toBeInTheDocument();
    });

    it("keeps the summary cards visible on every tab", () => {
      renderPage({ searchParams: "?tab=database" });
      expect(screen.getByText("JitaSpace")).toBeInTheDocument();
      expect(screen.getByText("Tranquility")).toBeInTheDocument();
      expect(screen.getByText("ESI API")).toBeInTheDocument();
    });

    it("switches the panel when another tab is clicked", () => {
      renderPage();
      fireEvent.click(screen.getByRole("tab", { name: "Background Jobs" }));
      expect(screen.getByText("Trigger Jobs Dashboard")).toBeInTheDocument();
      expect(
        screen.queryByText("Rate Limit Dashboard"),
      ).not.toBeInTheDocument();
    });
  });
});
