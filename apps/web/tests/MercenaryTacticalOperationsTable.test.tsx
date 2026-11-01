import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type * as TableModule from "~/components/MercenaryTacticalOperations/MercenaryTacticalOperationsTable";
import type {
  MercenaryTacticalOperationKind,
  OperationRow,
} from "~/components/MercenaryTacticalOperations/operationRows";

// The real DataTable runs the module-scope cell renderers. Entity names and
// planet names would resolve over ESI, so they render their ids instead, which
// keeps "which entity is this" assertable.
jest.mock("@jitaspace/ui", () => ({
  TimeAgoText: ({ date }: { date: Date }) => (
    <span>{`relative-${date.toISOString()}`}</span>
  ),
}));
jest.mock("@jitaspace/eve-components", () => ({
  EveEntityAvatar: () => null,
  EveEntityName: ({ entityId }: { entityId?: number }) => (
    <span>{`entity-${entityId}`}</span>
  ),
}));
jest.mock("~/components/Text", () => ({
  PlanetName: ({ planetId }: { planetId?: number }) => (
    <span>{`planet-${planetId}`}</span>
  ),
}));
jest.mock(
  "@jitaspace/eve-icons",
  () => new Proxy({}, { get: () => () => null }),
);

const { MercenaryTacticalOperationsTable, formatEveTime } =
  require("~/components/MercenaryTacticalOperations/MercenaryTacticalOperationsTable") as typeof TableModule;

const ALICE = 90000001;
const BOB = 90000002;
const PLANET = 40000002;

const ROGUE_DRONES: MercenaryTacticalOperationKind = {
  dungeonId: 12367,
  name: "Rogue Drone Emergence",
  description: "Destroy all Rogue Drones.",
  anarchyImpact: -20,
  developmentImpact: 10,
  infomorphBonus: 1350,
};

const row = (over: Partial<OperationRow> = {}): OperationRow => ({
  operationId: "3868eaed-8278-4cb7-9709-7d7de9c20dc7",
  mercenaryDenId: 1000000000001,
  characterIds: [ALICE],
  detailsStatus: "loaded",
  state: "Available",
  expires: "2026-11-01T12:00:00Z",
  dungeonId: 12367,
  kind: ROGUE_DRONES,
  ...over,
});

function renderTable(
  operations: OperationRow[],
  props: {
    showCharacters?: boolean;
    isLoading?: boolean;
    emptyText?: string;
  } = {},
) {
  return render(
    <MantineProvider>
      <MercenaryTacticalOperationsTable
        operations={operations}
        showCharacters={props.showCharacters ?? false}
        isLoading={props.isLoading}
        emptyText={props.emptyText}
      />
    </MantineProvider>,
  );
}

const bodyRows = () =>
  screen.getAllByRole("row").filter((r) => r.querySelector("td"));

describe("MercenaryTacticalOperationsTable", () => {
  it("names the operation from the SDE and links to its dungeon", () => {
    renderTable([row()]);

    const link = screen.getByRole("link", { name: "Rogue Drone Emergence" });
    expect(link).toHaveAttribute("href", "/dungeon/12367");
    expect(screen.getByText("Destroy all Rogue Drones.")).toBeInTheDocument();
  });

  it("names an operation the SDE does not know by its dungeon", () => {
    renderTable([row({ dungeonId: 99999, kind: undefined })]);

    expect(
      screen.getByRole("link", { name: "Operation 99999" }),
    ).toHaveAttribute("href", "/dungeon/99999");
  });

  it("shows the status as text, explaining it on hover", () => {
    renderTable([row({ state: "Started" })]);

    const badge = screen.getByText("In progress");
    expect(badge.closest("[title]")).toHaveAttribute(
      "title",
      "Started, not yet completed.",
    );
  });

  it("shows the expiry both relative to now and in EVE time", () => {
    const { container } = renderTable([row()]);

    expect(
      screen.getByText("relative-2026-11-01T12:00:00.000Z"),
    ).toBeInTheDocument();
    expect(screen.getByText("2026-11-01 12:00 EVE")).toBeInTheDocument();
    expect(container.querySelector("time")).toHaveAttribute(
      "datetime",
      "2026-11-01T12:00:00Z",
    );
  });

  it("shows the den's impact with its sign, and the infomorphs it earns", () => {
    renderTable([row()]);

    const cells = within(bodyRows()[0]!).getAllByRole("cell");
    const text = cells.map((cell) => cell.textContent);
    expect(text).toEqual(expect.arrayContaining(["+10", "-20", "1,350"]));
  });

  it("says which details could not be loaded", () => {
    renderTable([
      row({
        detailsStatus: "failed",
        state: undefined,
        expires: undefined,
        dungeonId: undefined,
        kind: undefined,
      }),
    ]);

    // Operation, status and expiry all come from the failed request.
    expect(screen.getAllByText("Unavailable")).toHaveLength(3);
  });

  it("holds a placeholder while an operation's details load", () => {
    renderTable([
      row({
        detailsStatus: "loading",
        state: undefined,
        expires: undefined,
        dungeonId: undefined,
        kind: undefined,
      }),
    ]);

    expect(screen.queryByText("Unavailable")).not.toBeInTheDocument();
    expect(bodyRows()).toHaveLength(1);
  });

  it("links the den's planet when it is known", () => {
    renderTable([row({ planetId: PLANET })]);

    expect(
      screen.getByRole("link", { name: `planet-${PLANET}` }),
    ).toHaveAttribute("href", `/planet/${PLANET}`);
  });

  it("says the den's location is unknown when it was not shared", () => {
    renderTable([row()]);

    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("names the characters only when there is more than one", () => {
    const { unmount } = renderTable([row({ characterIds: [ALICE, BOB] })], {
      showCharacters: true,
    });

    expect(
      screen.getByRole("columnheader", { name: /Characters/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(`entity-${ALICE}`)).toBeInTheDocument();
    expect(screen.getByText(`entity-${BOB}`)).toBeInTheDocument();
    unmount();

    renderTable([row()], { showCharacters: false });
    expect(
      screen.queryByRole("columnheader", { name: /Characters/ }),
    ).not.toBeInTheDocument();
  });

  it("lists what can still be done first, soonest to expire first", () => {
    renderTable([
      row({
        operationId: "expired",
        state: "Expired",
        expires: "2026-10-01T00:00:00Z",
        kind: { ...ROGUE_DRONES, name: "Long gone" },
      }),
      row({
        operationId: "later",
        expires: "2026-11-03T00:00:00Z",
        kind: { ...ROGUE_DRONES, name: "Later" },
      }),
      row({
        operationId: "started",
        state: "Started",
        expires: "2026-11-01T00:00:00Z",
        kind: { ...ROGUE_DRONES, name: "Underway" },
      }),
      row({
        operationId: "sooner",
        expires: "2026-11-02T00:00:00Z",
        kind: { ...ROGUE_DRONES, name: "Sooner" },
      }),
      row({
        operationId: "loading",
        detailsStatus: "loading",
        state: undefined,
        expires: undefined,
        dungeonId: undefined,
        kind: undefined,
      }),
    ]);

    expect(
      bodyRows().map((r) => r.querySelector("a")?.textContent ?? "(loading)"),
    ).toEqual(["Sooner", "Later", "Underway", "Long gone", "(loading)"]);
  });

  it("sorts by expiry from its header, soonest first", async () => {
    renderTable([
      row({
        operationId: "later",
        expires: "2026-11-03T00:00:00Z",
        kind: { ...ROGUE_DRONES, name: "Later" },
      }),
      row({
        operationId: "expired",
        state: "Expired",
        expires: "2026-10-01T00:00:00Z",
        kind: { ...ROGUE_DRONES, name: "Long gone" },
      }),
    ]);

    await userEvent.click(
      screen.getByRole("columnheader", { name: /Expires/ }),
    );

    expect(bodyRows().map((r) => r.querySelector("a")?.textContent)).toEqual([
      "Long gone",
      "Later",
    ]);
  });

  it("sorts by status in lifecycle order, not alphabetically", async () => {
    renderTable([
      row({ operationId: "expired", state: "Expired" }),
      row({ operationId: "started", state: "Started" }),
      row({
        operationId: "loading",
        detailsStatus: "loading",
        state: undefined,
        expires: undefined,
        dungeonId: undefined,
        kind: undefined,
      }),
      row({ operationId: "available", state: "Available" }),
    ]);
    const statuses = () =>
      bodyRows().map((r) => r.querySelector("[title]")?.textContent ?? null);

    // The initial sort.
    expect(statuses()).toEqual(["Available", "In progress", "Expired", null]);

    await userEvent.click(screen.getByRole("columnheader", { name: /Status/ }));

    // Reversed, with the row that has no status yet still last.
    expect(statuses()).toEqual(["Expired", "In progress", "Available", null]);
  });

  it("shows the empty text it is given", () => {
    renderTable([], { emptyText: "Nothing here." });

    expect(screen.getByText("Nothing here.")).toBeInTheDocument();
  });

  it("shows skeleton rows while loading", () => {
    const { container } = renderTable([], { isLoading: true });

    expect(
      container.querySelectorAll("tr[data-skeleton]").length,
    ).toBeGreaterThan(0);
  });
});

describe("formatEveTime", () => {
  it("formats in UTC to the minute", () => {
    expect(formatEveTime("2026-11-01T12:34:56Z")).toBe("2026-11-01 12:34");
  });

  it("converts an offset time to EVE time", () => {
    expect(formatEveTime("2026-11-01T14:00:00+02:00")).toBe("2026-11-01 12:00");
  });

  it("returns what it cannot parse unchanged", () => {
    expect(formatEveTime("not a date")).toBe("not a date");
  });
});
