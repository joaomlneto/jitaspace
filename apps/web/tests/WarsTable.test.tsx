import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// WarsTable takes `wars` directly as a prop (no internal data hook). Its column
// Cell renderers are module-scope components; rendering the real
// mantine-react-table with row data executes them. @jitaspace/ui supplies the
// avatar/name/anchor/date children. Stub every export to a pass-through that
// renders its `children` — wrapper components (e.g. WarAnchor, which wraps the
// war id) forward their text, while leaf components (avatars) get no children
// and render nothing.
jest.mock("@jitaspace/ui", () => {
  const React = require("react");
  const passThrough = ({ children }: { children?: unknown }) =>
    children == null ? null : React.createElement(React.Fragment, null, children);
  return new Proxy({}, { get: () => passThrough });
});
jest.mock(
  "@jitaspace/eve-icons",
  () => new Proxy({}, { get: () => () => null }),
);

import type { War } from "~/components/Wars/WarsTable";

const BASE_WAR: War = {
  warId: 9001,
  aggressorCorporationId: 111,
  aggressorAllianceId: 222,
  aggressorIskDestroyed: 1234567,
  aggressorShipsKilled: 42,
  allianceAllies: [333, 444],
  corporationAllies: [555],
  declaredDate: new Date("2024-01-01T00:00:00Z"),
  defenderCorporationId: 666,
  defenderAllianceId: 777,
  defenderIskDestroyed: 7654321,
  defenderShipsKilled: 7,
  startedDate: new Date("2024-01-02T00:00:00Z"),
  finishedDate: new Date("2024-02-01T00:00:00Z"),
  isMutual: true,
  isOpenForAllies: true,
  retractedDate: new Date("2024-01-15T00:00:00Z"),
  updatedAt: new Date("2024-02-02T00:00:00Z"),
};

// Second war exercises the opposite branches: no started/finished/retracted
// dates, mutual=false, open-for-allies=false, no allies.
const MINIMAL_WAR: War = {
  warId: 9002,
  aggressorCorporationId: undefined,
  aggressorAllianceId: undefined,
  aggressorIskDestroyed: 0,
  aggressorShipsKilled: 0,
  allianceAllies: [],
  corporationAllies: [],
  declaredDate: new Date("2024-03-01T00:00:00Z"),
  defenderCorporationId: undefined,
  defenderAllianceId: undefined,
  defenderIskDestroyed: 555,
  defenderShipsKilled: 1,
  startedDate: undefined,
  finishedDate: undefined,
  isMutual: false,
  isOpenForAllies: false,
  retractedDate: undefined,
  updatedAt: new Date("2024-03-02T00:00:00Z"),
};

function renderTable(wars: War[]) {
  const { WarsTable } = require("~/components/Wars/WarsTable");
  return render(
    <MantineProvider>
      <WarsTable wars={wars} />
    </MantineProvider>,
  );
}

describe("WarsTable", () => {
  it("renders without crashing for an empty war list", () => {
    renderTable([]);
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("renders aggressor/defender ISK-destroyed cells with locale formatting", () => {
    renderTable([BASE_WAR]);
    // Cell: `${value.toLocaleString()} ISK`
    expect(screen.getByText("1,234,567 ISK")).toBeInTheDocument();
    expect(screen.getByText("7,654,321 ISK")).toBeInTheDocument();
  });

  it("renders ships-killed counts from row data", () => {
    renderTable([BASE_WAR]);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("renders Mutual / Open-for-Allies as Yes for the first war", () => {
    renderTable([BASE_WAR]);
    // isMutual=true and isOpenForAllies=true both render "Yes"
    expect(screen.getAllByText("Yes").length).toBeGreaterThanOrEqual(2);
  });

  it("renders Mutual / Open-for-Allies as No for a war with both false", () => {
    renderTable([MINIMAL_WAR]);
    expect(screen.getAllByText("No").length).toBeGreaterThanOrEqual(2);
  });

  it("renders both rows when given two wars (covers conditional date branches)", () => {
    renderTable([BASE_WAR, MINIMAL_WAR]);
    // war ids appear in the WarIdCell
    expect(screen.getByText("9001")).toBeInTheDocument();
    expect(screen.getByText("9002")).toBeInTheDocument();
  });
});
