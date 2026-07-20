import "@testing-library/jest-dom/jest-globals";

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

import type { WarRoomData, WarRoomWar } from "~/components/Wars/WarRoom";

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

function war(overrides: Partial<WarRoomWar>): WarRoomWar {
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
    startedDate: iso,
    finishedDate: undefined,
    retractedDate: undefined,
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

const DATA: WarRoomData = {
  stats: {
    totalActive: 2,
    activeCount: 2,
    startingCount: 0,
    endingCount: 0,
    mutualCount: 0,
    openForAlliesCount: 0,
    totalIskDestroyed: 5e9,
    totalShipsKilled: 3,
    warsWithCombat: 1,
    declaredLast24h: 0,
    declaredLast7d: 2,
    generatedAt: new Date("2026-06-05T00:00:00Z").toISOString(),
  },
  wars: [
    war({
      warId: 1,
      aggressorCorporationId: 111,
      defenderAllianceId: 222,
      aggressorIskDestroyed: 5e9,
      aggressorShipsKilled: 3,
      totalIskDestroyed: 5e9,
      totalShipsKilled: 3,
      aggressorIskShare: 1,
      // all optional dates set → exercises the toTableWar date branches
      finishedDate: new Date("2026-07-01T00:00:00Z").toISOString(),
      retractedDate: new Date("2026-06-20T00:00:00Z").toISOString(),
    }),
    war({
      warId: 2,
      aggressorCorporationId: 333,
      defenderCorporationId: 444,
      startedDate: undefined,
      status: "pending",
    }),
  ],
  topAggressors: [
    { corporationId: 111, warCount: 1, iskDestroyed: 5e9, shipsKilled: 3 },
  ],
};

function renderView(experimental: boolean) {
  const { usePreferencesStore } = require("~/lib/preferences");
  usePreferencesStore.setState({ experimentalActiveWars: experimental });
  const { ActiveWarsView } = require("~/components/Wars/ActiveWarsView");
  return render(
    <MantineProvider>
      <ActiveWarsView data={DATA} />
    </MantineProvider>,
  );
}

afterEach(() => {
  const { usePreferencesStore } = require("~/lib/preferences");
  usePreferencesStore.setState({ experimentalActiveWars: false });
});

describe("ActiveWarsView feature gate", () => {
  it("renders the classic table when the flag is off", () => {
    renderView(false);
    expect(screen.getByText(/Active Wars \(2\)/)).toBeInTheDocument();
    expect(
      screen.queryByText("Most active aggressors"),
    ).not.toBeInTheDocument();
  });

  it("renders the new overview when the flag is on", () => {
    renderView(true);
    expect(screen.getByText("Most active aggressors")).toBeInTheDocument();
    expect(screen.queryByText(/Active Wars \(2\)/)).not.toBeInTheDocument();
  });
});
