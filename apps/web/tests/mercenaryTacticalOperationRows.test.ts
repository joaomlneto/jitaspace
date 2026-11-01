import { describe, expect, it } from "@jest/globals";

import type { MercenaryTacticalOperation } from "@jitaspace/hooks";

import type {
  MercenaryTacticalOperationKind,
  OperationRow,
} from "~/components/MercenaryTacticalOperations/operationRows";
import {
  countByState,
  filterOperationRows,
  nextSelection,
  OPERATION_STATE_COLORS,
  OPERATION_STATE_DESCRIPTIONS,
  OPERATION_STATE_LABELS,
  OPERATION_STATES,
  operationName,
  toOperationRows,
} from "~/components/MercenaryTacticalOperations/operationRows";

const ALICE = 90000001;
const BOB = 90000002;
const DEN = 1000000000001;
const OTHER_DEN = 1000000000002;
const PLANET = 40000002;

const ROGUE_DRONES: MercenaryTacticalOperationKind = {
  dungeonId: 12367,
  name: "Rogue Drone Emergence",
  description: "Destroy all Rogue Drones.",
  anarchyImpact: -20,
  developmentImpact: 10,
  infomorphBonus: 350,
};

const operation = (
  operationId: string,
  over: Partial<MercenaryTacticalOperation> = {},
): MercenaryTacticalOperation => ({
  operationId,
  mercenaryDenId: DEN,
  characterIds: [ALICE],
  ...over,
});

const details = (
  id: string,
  over: Partial<NonNullable<MercenaryTacticalOperation["details"]>> = {},
): NonNullable<MercenaryTacticalOperation["details"]> => ({
  id,
  mercenary_den_id: DEN,
  state: "Available",
  dungeon_type_id: 12367,
  expires: "2026-11-01T12:00:00Z",
  ...over,
});

const row = (over: Partial<OperationRow> = {}): OperationRow => ({
  operationId: "op",
  mercenaryDenId: DEN,
  characterIds: [ALICE],
  detailsStatus: "loaded",
  state: "Available",
  ...over,
});

describe("toOperationRows", () => {
  it("joins an operation's details with the SDE's description of its kind", () => {
    const [result] = toOperationRows(
      [operation("a", { details: details("a") })],
      [ROGUE_DRONES],
      new Set(),
      new Map([[DEN, PLANET]]),
    );

    expect(result).toEqual({
      operationId: "a",
      mercenaryDenId: DEN,
      characterIds: [ALICE],
      detailsStatus: "loaded",
      state: "Available",
      expires: "2026-11-01T12:00:00Z",
      dungeonId: 12367,
      kind: ROGUE_DRONES,
      planetId: PLANET,
    });
  });

  it("keeps an operation whose dungeon the SDE does not know, without a kind", () => {
    const [result] = toOperationRows(
      [operation("a", { details: details("a", { dungeon_type_id: 99999 }) })],
      [ROGUE_DRONES],
      new Set(),
      new Map(),
    );

    expect(result?.dungeonId).toBe(99999);
    expect(result?.kind).toBeUndefined();
    expect(result?.planetId).toBeUndefined();
  });

  it("tells details still loading apart from details that failed", () => {
    const rows = toOperationRows(
      [operation("loading"), operation("failed")],
      [ROGUE_DRONES],
      new Set(["failed"]),
      new Map(),
    );

    expect(rows.map((r) => [r.operationId, r.detailsStatus])).toEqual([
      ["loading", "loading"],
      ["failed", "failed"],
    ]);
    expect(rows[0]?.state).toBeUndefined();
    expect(rows[0]?.expires).toBeUndefined();
  });

  it("locates a den from the listing alone, before its details arrive", () => {
    const [result] = toOperationRows(
      [operation("a", { mercenaryDenId: OTHER_DEN })],
      [],
      new Set(),
      new Map([[OTHER_DEN, PLANET]]),
    );

    expect(result?.planetId).toBe(PLANET);
  });
});

describe("operationName", () => {
  it("prefers the SDE's name", () => {
    expect(operationName(row({ dungeonId: 12367, kind: ROGUE_DRONES }))).toBe(
      "Rogue Drone Emergence",
    );
  });

  it("names an unknown kind by its dungeon", () => {
    expect(operationName(row({ dungeonId: 99999 }))).toBe("Operation 99999");
  });

  it("falls back when there is nothing to name it by", () => {
    expect(operationName(row())).toBe("Unknown operation");
  });
});

describe("filterOperationRows", () => {
  const aliceAvailable = row({ operationId: "a", characterIds: [ALICE] });
  const bobExpired = row({
    operationId: "b",
    characterIds: [BOB],
    state: "Expired",
  });
  const sharedStarted = row({
    operationId: "s",
    characterIds: [ALICE, BOB],
    state: "Started",
  });
  const bobLoading = row({
    operationId: "l",
    characterIds: [BOB],
    detailsStatus: "loading",
    state: undefined,
  });
  const rows = [aliceAvailable, bobExpired, sharedStarted, bobLoading];

  it("keeps everything when no filter is set", () => {
    expect(
      filterOperationRows(rows, { characterIds: null, states: null }),
    ).toEqual(rows);
  });

  it("keeps an operation any selected character can see", () => {
    expect(
      filterOperationRows(rows, { characterIds: [ALICE], states: null }),
    ).toEqual([aliceAvailable, sharedStarted]);
  });

  it("keeps the selected states, and the operations with no state yet", () => {
    expect(
      filterOperationRows(rows, {
        characterIds: null,
        states: ["Expired"],
      }),
    ).toEqual([bobExpired, bobLoading]);
  });

  it("applies both filters together", () => {
    expect(
      filterOperationRows(rows, {
        characterIds: [BOB],
        states: ["Started"],
      }),
    ).toEqual([sharedStarted, bobLoading]);
  });

  it("keeps nothing for an empty character selection", () => {
    expect(
      filterOperationRows(rows, { characterIds: [], states: null }),
    ).toEqual([]);
  });
});

describe("nextSelection", () => {
  it("collapses a full selection back to the default", () => {
    expect(nextSelection(["b", "a"], ["a", "b"])).toBeNull();
  });

  it("keeps a partial selection", () => {
    expect(nextSelection(["a"], ["a", "b"])).toEqual(["a"]);
  });

  it("keeps an empty selection, which is a choice of its own", () => {
    expect(nextSelection([], ["a", "b"])).toEqual([]);
  });

  it("does not treat an empty list of options as fully selected", () => {
    expect(nextSelection([], [])).toEqual([]);
  });
});

describe("countByState", () => {
  it("counts the rows in each state, skipping those with none yet", () => {
    expect(
      countByState([
        row({ state: "Available" }),
        row({ state: "Available" }),
        row({ state: "Removed" }),
        row({ state: undefined, detailsStatus: "loading" }),
      ]),
    ).toEqual({ Available: 2, Removed: 1 });
  });
});

describe("state presentation", () => {
  it("labels, describes and colours every state ESI defines", () => {
    for (const state of OPERATION_STATES) {
      expect(OPERATION_STATE_LABELS[state]).toBeTruthy();
      expect(OPERATION_STATE_DESCRIPTIONS[state]).toBeTruthy();
      expect(OPERATION_STATE_COLORS[state]).toBeTruthy();
    }
    expect(OPERATION_STATES).toHaveLength(
      Object.keys(OPERATION_STATE_LABELS).length,
    );
  });
});
