import "@testing-library/jest-dom/jest-globals";

import type { OnUrlUpdateFunction } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";

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

function renderPage(
  initialWaypoints: string[],
  adapter: { searchParams?: string; onUrlUpdate?: OnUrlUpdateFunction } = {},
) {
  const Page = require("~/app/travel/[[...waypoints]]/page.client").default;
  return render(
    <MantineProvider>
      <Page solarSystems={solarSystems} initialWaypoints={initialWaypoints} />
    </MantineProvider>,
    // The route preference + penalty sliders are nuqs-backed; hasMemory lets
    // URL writes round-trip so the controls behave as they do in a browser.
    { wrapper: withNuqsTestingAdapter({ hasMemory: true, ...adapter }) },
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

  it("does not push a URL while a waypoint slot is still empty", () => {
    renderPage([]);

    // Fill the SECOND select first, leaving slot 0 empty. Serializing that gap
    // produced "/travel//Alpha": Next 308-redirects the empty segment away and
    // parseInitialWaypoints drops it, so Alpha would come back in slot 0 —
    // silently swapping which end of the route the user picked.
    fireEvent.click(screen.getAllByText("Alpha")[1]!);
    expect(mockPush).not.toHaveBeenCalled();

    // The selection is still held in local state, so the form is correct...
    expect(screen.getAllByRole("combobox")[1]).toHaveValue("Alpha");

    // ...and the URL lands, in the right order, once the pair is complete.
    fireEvent.click(screen.getAllByText("Delta")[0]!);
    expect(mockPush).toHaveBeenLastCalledWith("/travel/Delta/Alpha");
  });

  it("never serializes an empty path segment", () => {
    renderPage([]);
    fireEvent.click(screen.getAllByText("Alpha")[1]!);
    fireEvent.click(screen.getAllByText("Delta")[0]!);
    fireEvent.click(screen.getAllByText("Beta")[1]!);

    for (const call of mockPush.mock.calls) {
      expect(call[0] as string).not.toMatch(/\/\//);
    }
  });
});

describe("Travel Page route preference URL sync", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  const prefControl = (label: string) =>
    screen.getByRole("radio", { name: label });

  it("defaults to Shortest with no penalty sliders shown", () => {
    renderPage(["30000001", "30000004"]);

    expect(prefControl("Shortest")).toBeChecked();
    expect(screen.queryByText(/Null Sec Penalty/)).toBeNull();
  });

  it("restores the preference from the URL on load", () => {
    renderPage(["30000001", "30000004"], { searchParams: "?pref=secure" });

    expect(prefControl("More Secure")).toBeChecked();
    // A preset derives its penalties, so the custom sliders stay hidden.
    expect(screen.queryByText(/Null Sec Penalty/)).toBeNull();
  });

  it("restores custom penalties from the URL and shows the sliders", () => {
    renderPage(["30000001", "30000004"], {
      searchParams: "?pref=custom&nullSec=250&lowSec=40&highSec=5",
    });

    expect(prefControl("Custom")).toBeChecked();
    expect(screen.getByText("Null Sec Penalty (250)")).toBeInTheDocument();
    expect(screen.getByText("Low Sec Penalty (40)")).toBeInTheDocument();
    expect(screen.getByText("High Sec Penalty (5)")).toBeInTheDocument();
  });

  it("writes the chosen preference to the URL as a slug", async () => {
    const onUrlUpdate = jest.fn<OnUrlUpdateFunction>();
    renderPage(["30000001", "30000004"], { onUrlUpdate });

    fireEvent.click(prefControl("Less Secure"));

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    // Slug, not the display label — no "?pref=Less%20Secure".
    expect(onUrlUpdate.mock.calls.at(-1)![0].queryString).toBe(
      "?pref=insecure",
    );
  });

  // Presets imply their penalties, so switching to one must clear the params
  // rather than leave a stale `nullSec` disagreeing with the preference.
  it("clears penalty params when switching from custom back to a preset", async () => {
    const onUrlUpdate = jest.fn<OnUrlUpdateFunction>();
    renderPage(["30000001", "30000004"], {
      searchParams: "?pref=custom&nullSec=250",
      onUrlUpdate,
    });

    fireEvent.click(prefControl("Shortest"));

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    expect(onUrlUpdate.mock.calls.at(-1)![0].queryString).toBe("");
  });

  // Switching to Custom should start from the preset you were on, not snap to
  // zero — this was the pre-migration behaviour and is worth keeping.
  it("seeds the custom sliders from the preset it was switched from", () => {
    renderPage(["30000001", "30000004"], { searchParams: "?pref=secure" });

    fireEvent.click(prefControl("Custom"));

    expect(screen.getByText("Null Sec Penalty (100)")).toBeInTheDocument();
    expect(screen.getByText("Low Sec Penalty (100)")).toBeInTheDocument();
    expect(screen.getByText("High Sec Penalty (0)")).toBeInTheDocument();
  });

  // Waypoints live in the path, so changing one is a router.push to a new URL.
  // That push must carry the control params or the preference silently resets —
  // which would defeat the whole point of syncing it.
  it("carries the route preference across a waypoint change", () => {
    renderPage([], { searchParams: "?pref=secure" });

    fireEvent.click(screen.getAllByText("Delta")[0]!);

    expect(mockPush).toHaveBeenLastCalledWith("/travel/Delta?pref=secure");
  });

  it("carries custom penalties across a waypoint change", () => {
    renderPage([], {
      searchParams: "?pref=custom&nullSec=250&lowSec=40",
    });

    fireEvent.click(screen.getAllByText("Delta")[0]!);

    expect(mockPush).toHaveBeenLastCalledWith(
      "/travel/Delta?pref=custom&nullSec=250&lowSec=40",
    );
  });

  // A preset implies its penalties, so the carried URL must not regain the
  // redundant params that PRESET_PENALTIES exists to keep out.
  it("does not add redundant penalty params for a preset", () => {
    renderPage([], { searchParams: "?pref=secure" });

    fireEvent.click(screen.getAllByText("Delta")[0]!);

    const pushed = mockPush.mock.calls.at(-1)![0] as string;
    expect(pushed).not.toMatch(/nullSec|lowSec|highSec/);
  });

  it("leaves the pushed URL clean when everything is at its default", () => {
    renderPage([]);

    fireEvent.click(screen.getAllByText("Delta")[0]!);

    expect(mockPush).toHaveBeenLastCalledWith("/travel/Delta");
  });

  // A negative penalty makes the pathfinder's `1 + penalty` edge weight
  // negative, and NBA* silently returns a wildly wrong route rather than
  // erroring. Only reachable by hand-editing, so clamp at the parser.
  it("clamps a negative penalty from a hand-edited URL to the slider minimum", () => {
    renderPage(["30000001", "30000004"], {
      searchParams: "?pref=custom&nullSec=-500",
    });

    expect(screen.getByText("Null Sec Penalty (0)")).toBeInTheDocument();
  });

  it("clamps an over-large penalty to the slider maximum", () => {
    renderPage(["30000001", "30000004"], {
      searchParams: "?pref=custom&lowSec=9999",
    });

    expect(screen.getByText("Low Sec Penalty (500)")).toBeInTheDocument();
  });

  // The clamped value is what gets carried forward, not the raw URL text.
  it("carries the clamped penalty across a waypoint change", () => {
    renderPage([], { searchParams: "?pref=custom&nullSec=-5" });

    fireEvent.click(screen.getAllByText("Delta")[0]!);

    const pushed = mockPush.mock.calls.at(-1)![0] as string;
    expect(pushed).not.toContain("-5");
    expect(pushed).toBe("/travel/Delta?pref=custom");
  });

  it("ignores out-of-range preference values in a hand-edited URL", () => {
    renderPage(["30000001", "30000004"], { searchParams: "?pref=bogus" });

    expect(prefControl("Shortest")).toBeChecked();
  });
});
