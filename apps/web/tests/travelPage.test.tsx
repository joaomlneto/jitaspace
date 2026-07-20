import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// The Travel page uses next/navigation (useRouter), @jitaspace/eve-icons
// (MapIcon) and the local RouteTable — which fetches kill data per system, so
// it is stubbed here to render the page in isolation. ngraph (graph + NBA*
// pathfinding) and the Mantine controls run for real.
// ---------------------------------------------------------------------------

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@jitaspace/eve-icons", () => ({
  MapIcon: () => <span>MapIcon</span>,
}));

jest.mock("~/components/Travel", () => ({
  RouteTable: ({ route }: { route: { id: string }[] }) => (
    <div data-testid="route-table">{route.length} systems</div>
  ),
}));

// A tiny slice of New Eden spanning all three security bands (high/low/null),
// so the pathfinder's per-band distance branches are all exercised:
// Alpha(0.9) — Beta(0.3) — Gamma(-0.5) — Delta(0.9)
const solarSystems = {
  "30000001": { name: "Alpha", securityStatus: 0.9, neighbors: [30000002] },
  "30000002": {
    name: "Beta",
    securityStatus: 0.3,
    neighbors: [30000001, 30000003],
  },
  "30000003": {
    name: "Gamma",
    securityStatus: -0.5,
    neighbors: [30000002, 30000004],
  },
  "30000004": { name: "Delta", securityStatus: 0.9, neighbors: [30000003] },
};

function renderPage(initialWaypoints: string[]) {
  const Page = require("~/app/travel/[[...waypoints]]/page.client").default;
  return render(
    <MantineProvider>
      <Page solarSystems={solarSystems} initialWaypoints={initialWaypoints} />
    </MantineProvider>,
  );
}

describe("Travel Page", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it("computes a route across security bands between two waypoints", () => {
    renderPage(["30000001", "30000004"]);

    expect(screen.getByText("Travel Planner")).toBeInTheDocument();
    // Alpha → Beta → Gamma → Delta = 4 systems in the path.
    expect(screen.getByTestId("route-table")).toHaveTextContent("4 systems");
  });

  it("produces an empty route when given fewer than two waypoints", () => {
    renderPage(["30000001"]);

    expect(screen.getByTestId("route-table")).toHaveTextContent("0 systems");
  });

  it("always renders two waypoint selects, even with no initial waypoints", () => {
    // A bare /travel visit has no waypoints; the form must still be usable
    // (a route needs both an origin and a destination).
    renderPage([]);

    // Each Select renders one combobox input; there must be two (origin + dest).
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
  });

  it("keeps the pushed URL in sync with the just-selected waypoints", () => {
    renderPage([]);

    // Every select renders the same option list into the DOM (each sorted
    // Alpha/Beta/Delta/Gamma), with the first select's options appearing first.
    // Clicking an option fires the Select's onChange regardless of dropdown
    // visibility, so we click directly and disambiguate by DOM order.
    fireEvent.click(screen.getAllByText("Delta")[0]!); // destination -> select 0
    expect(mockPush).toHaveBeenLastCalledWith("/travel/Delta");

    fireEvent.click(screen.getAllByText("Alpha")[1]!); // origin -> select 1
    // The URL reflects BOTH selections — before the fix the second push read a
    // stale waypoints array and dropped the change, lagging one interaction.
    expect(mockPush).toHaveBeenLastCalledWith("/travel/Delta/Alpha");
  });
});
