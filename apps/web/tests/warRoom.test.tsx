import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";

import type { WarRoomData, WarRoomWar } from "~/components/Wars/WarRoom";

// The EVE "smart" components fetch data; stub every export to a pass-through so
// the war rows/table/leaderboards render deterministically. eve-icons → null.
const passThroughProxy = () => {
  const React = require("react");
  const passThrough = ({ children }: { children?: unknown }) =>
    children == null
      ? null
      : React.createElement(React.Fragment, null, children);
  return new Proxy({}, { get: () => passThrough });
};
jest.mock("@jitaspace/ui", () => passThroughProxy());
jest.mock("@jitaspace/eve-components", () => passThroughProxy());
jest.mock(
  "@jitaspace/eve-icons",
  () => new Proxy({}, { get: () => () => null }),
);

function war(overrides: Partial<WarRoomWar> = {}): WarRoomWar {
  const iso = new Date("2026-06-01T00:00:00Z").toISOString();
  return {
    warId: 1,
    aggressorIskDestroyed: 0,
    aggressorShipsKilled: 0,
    defenderIskDestroyed: 0,
    defenderShipsKilled: 0,
    allianceAllies: [],
    corporationAllies: [],
    declaredDate: iso,
    isMutual: false,
    isOpenForAllies: false,
    updatedAt: iso,
    status: "active",
    totalIskDestroyed: 0,
    totalShipsKilled: 0,
    ageDays: 3,
    aggressorIskShare: null,
    ...overrides,
  };
}

function richData(): WarRoomData {
  const wars: WarRoomWar[] = [
    war({
      warId: 1,
      aggressorAllianceId: 1001,
      defenderCorporationId: 2001,
      aggressorIskDestroyed: 48.2e9,
      defenderIskDestroyed: 39.6e9,
      aggressorShipsKilled: 134,
      defenderShipsKilled: 110,
      totalIskDestroyed: 87.8e9,
      totalShipsKilled: 244,
      ageDays: 34,
      aggressorIskShare: 48.2 / 87.8,
      status: "active",
      isMutual: true,
      allianceAllies: [3001, 3002], // plural "allies"
    }),
    war({
      warId: 2,
      aggressorCorporationId: 1002,
      defenderAllianceId: 2002,
      aggressorIskDestroyed: 20e9,
      defenderIskDestroyed: 80e9,
      aggressorShipsKilled: 20,
      defenderShipsKilled: 80,
      totalIskDestroyed: 100e9,
      totalShipsKilled: 100,
      ageDays: 15,
      aggressorIskShare: 0.2,
      status: "active",
      isOpenForAllies: true,
      corporationAllies: [5001], // singular "ally"
    }),
    war({
      warId: 3,
      aggressorCorporationId: 1003,
      defenderCorporationId: 2003,
      status: "pending",
      ageDays: 0,
    }),
    war({
      warId: 4,
      aggressorAllianceId: 1004,
      defenderCorporationId: 2004,
      status: "retracting",
      aggressorIskDestroyed: 5e9,
      defenderIskDestroyed: 5e9,
      aggressorShipsKilled: 5,
      defenderShipsKilled: 5,
      totalIskDestroyed: 10e9,
      totalShipsKilled: 10,
      ageDays: 20,
      aggressorIskShare: 0.5,
    }),
  ];
  for (let i = 5; i <= 30; i++) {
    wars.push(
      war({
        warId: i,
        aggressorCorporationId: 1000 + i,
        defenderCorporationId: 2000 + i,
        status: "active",
        ageDays: 3,
      }),
    );
  }

  return {
    stats: {
      totalActive: wars.length,
      activeCount: 28,
      startingCount: 1,
      endingCount: 1,
      mutualCount: 1,
      openForAlliesCount: 1,
      totalIskDestroyed: 197.8e9,
      totalShipsKilled: 354,
      warsWithCombat: 3,
      declaredLast24h: 0,
      declaredLast7d: 4,
      generatedAt: new Date("2026-06-05T00:00:00Z").toISOString(),
    },
    wars,
    topAggressors: [
      { allianceId: 1001, warCount: 5, iskDestroyed: 48.2e9, shipsKilled: 134 },
      { corporationId: 1002, warCount: 3, iskDestroyed: 0, shipsKilled: 0 },
    ],
  };
}

function renderRoom(data: WarRoomData) {
  const { WarRoom } = require("~/components/Wars/WarRoom");
  return render(
    <MantineProvider>
      <WarRoom data={data} />
    </MantineProvider>,
  );
}

describe("WarRoom overview", () => {
  it("renders the masthead, stat header and both leaderboards", () => {
    renderRoom(richData());
    expect(screen.getByText("Active Wars")).toBeInTheDocument();
    expect(screen.getByText("Most active aggressors")).toBeInTheDocument();
    expect(screen.getByText("Heaviest fighting")).toBeInTheDocument();
    expect(screen.getByText("All wars")).toBeInTheDocument();
    // leaderboard value + "wars" fallback when an aggressor has no ISK dealt
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("wars")).toBeInTheDocument();
  });

  it("paginates the row view with 'Show more'", () => {
    renderRoom(richData());
    // 30 wars, 24 shown initially → 6 remaining
    fireEvent.click(
      screen.getByRole("button", { name: /show more \(6 more\)/i }),
    );
    expect(screen.queryByText(/show more/i)).toBeNull();
  });

  it("switches to the table view and sorts by column (both directions)", () => {
    const { container } = renderRoom(richData());
    fireEvent.click(container.querySelector('input[value="table"]')!);
    expect(container.querySelector("table")).toBeInTheDocument();
    expect(screen.getByText("Balance")).toBeInTheDocument();

    const sortable = container.querySelectorAll("th button");
    // first sortable header is the active "ISK dealt" sort → toggles to ascending
    fireEvent.click(sortable[0]!);
    expect(
      container.querySelector('th[aria-sort="ascending"]'),
    ).toBeInTheDocument();
    // a different header switches the key (descending)
    fireEvent.click(sortable[1]!);
    expect(
      container.querySelector('th[aria-sort="descending"]'),
    ).toBeInTheDocument();
    // a third sortable header re-keys the sort
    fireEvent.click(sortable[2]!);
    expect(container.querySelector('th[aria-sort="descending"]')).toBeInTheDocument();
  });

  it("filters by status and attribute, showing an empty state", () => {
    const { container } = renderRoom(richData());
    // narrow to the single 'Starting' war
    fireEvent.click(container.querySelector('input[value="starting"]')!);
    expect(screen.getByText(/1 shown/)).toBeInTheDocument();
    // add the 'In combat' toggle → the starting war has no kills → empty
    fireEvent.click(screen.getByRole("checkbox", { name: "In combat" }));
    expect(
      screen.getByText("No wars match these filters."),
    ).toBeInTheDocument();
  });
});

describe("WarRoom with no combat", () => {
  it("shows the empty heaviest-fighting note", () => {
    const data = richData();
    const quiet = {
      ...data,
      wars: data.wars.map((w) => ({
        ...w,
        aggressorIskDestroyed: 0,
        defenderIskDestroyed: 0,
        aggressorShipsKilled: 0,
        defenderShipsKilled: 0,
        totalIskDestroyed: 0,
        totalShipsKilled: 0,
        aggressorIskShare: null,
      })),
    };
    renderRoom(quiet);
    expect(screen.getByText("No kills recorded yet.")).toBeInTheDocument();
  });
});

describe("WarRoom with no wars", () => {
  it("renders empty leaderboards and an empty war list", () => {
    renderRoom({
      stats: {
        totalActive: 0,
        activeCount: 0,
        startingCount: 0,
        endingCount: 0,
        mutualCount: 0,
        openForAlliesCount: 0,
        totalIskDestroyed: 0,
        totalShipsKilled: 0,
        warsWithCombat: 0,
        declaredLast24h: 0,
        declaredLast7d: 0,
        generatedAt: new Date("2026-06-05T00:00:00Z").toISOString(),
      },
      wars: [],
      topAggressors: [],
    });
    expect(
      screen.getByText("No wars match these filters."),
    ).toBeInTheDocument();
    expect(screen.getByText("No kills recorded yet.")).toBeInTheDocument();
  });
});
