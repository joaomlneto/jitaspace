import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// EsiStatusDashboard reads ESI route status via useGetMetaStatus from the
// generated esi-client. Mock the package so each branch (no data -> null,
// all-operational alert, grouped degraded table) can be rendered.
const mockUseGetMetaStatus = jest.fn();

jest.mock("@jitaspace/esi-client", () => ({
  useGetMetaStatus: (...args: unknown[]) => mockUseGetMetaStatus(...args),
}));

function renderDashboard(props?: { initialShowAll?: boolean }) {
  const { EsiStatusDashboard } = require("~/components/Status/EsiStatusDashboard");
  return render(
    <MantineProvider>
      <EsiStatusDashboard initialShowAll={props?.initialShowAll} />
    </MantineProvider>,
  );
}

describe("EsiStatusDashboard", () => {
  beforeEach(() => {
    mockUseGetMetaStatus.mockReset();
  });

  it("renders nothing when there is no status data and no groups", () => {
    mockUseGetMetaStatus.mockReturnValue({ data: undefined });
    renderDashboard();
    expect(screen.queryByText("ESI Endpoints Status")).not.toBeInTheDocument();
  });

  it("shows the operational alert when all endpoints are OK (degraded-only view)", () => {
    mockUseGetMetaStatus.mockReturnValue({
      data: {
        data: {
          routes: [
            { method: "get", path: "/characters/{id}/", status: "OK" },
            { method: "get", path: "/markets/prices/", status: "OK" },
          ],
        },
      },
    });
    // initialShowAll defaults to false -> all OK routes filtered out -> no groups
    renderDashboard();
    expect(screen.getByText("ESI Endpoints Status")).toBeInTheDocument();
    expect(
      screen.getByText("All ESI endpoints are currently operational."),
    ).toBeInTheDocument();
  });

  it("groups and renders degraded endpoints by first path segment", () => {
    mockUseGetMetaStatus.mockReturnValue({
      data: {
        data: {
          routes: [
            { method: "get", path: "/characters/{id}/", status: "OK" },
            { method: "post", path: "/markets/structures/", status: "Degraded" },
            { method: "get", path: "/wallet/journal/", status: "Down" },
          ],
        },
      },
    });
    // default degraded-only view: only the two non-OK routes appear, grouped
    renderDashboard();

    // group headers from the first path segment
    expect(screen.getByText("markets")).toBeInTheDocument();
    expect(screen.getByText("wallet")).toBeInTheDocument();
    // route methods uppercased
    expect(screen.getByText("POST")).toBeInTheDocument();
    // route paths
    expect(screen.getByText("/markets/structures/")).toBeInTheDocument();
    expect(screen.getByText("/wallet/journal/")).toBeInTheDocument();
    // the operational alert is NOT shown when there are degraded groups
    expect(
      screen.queryByText("All ESI endpoints are currently operational."),
    ).not.toBeInTheDocument();
  });

  it("renders every endpoint (including OK) when initialShowAll is true", () => {
    mockUseGetMetaStatus.mockReturnValue({
      data: {
        data: {
          routes: [
            { method: "get", path: "/characters/{id}/", status: "OK" },
            { method: "get", path: "/alliances/", status: "Recovering" },
          ],
        },
      },
    });
    renderDashboard({ initialShowAll: true });

    // both groups render because OK routes are not filtered out
    expect(screen.getByText("characters")).toBeInTheDocument();
    expect(screen.getByText("alliances")).toBeInTheDocument();
    expect(screen.getByText("/characters/{id}/")).toBeInTheDocument();
  });
});
