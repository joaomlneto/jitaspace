import { describe, expect, it } from "@jest/globals";

import type { AllianceRow } from "../helpers/planAllianceUpdates";
import { planAllianceUpdates } from "../helpers/planAllianceUpdates";

const alliance = (
  allianceId: number,
  overrides: Partial<AllianceRow> = {},
): AllianceRow => ({
  allianceId,
  creatorCorporationId: 1000,
  dateFounded: new Date("2020-01-01T00:00:00Z"),
  executorCorporationId: 1000,
  factionId: null,
  name: `Alliance ${allianceId}`,
  ticker: "TICK",
  isDeleted: false,
  ...overrides,
});

describe("planAllianceUpdates", () => {
  it("does nothing when the database already matches ESI", () => {
    const plan = planAllianceUpdates({
      esiAlliances: [alliance(1)],
      esiMemberCorporations: new Map([[1, [1000]]]),
      // a distinct Date instance with the same instant is not a change
      dbAlliances: [
        alliance(1, { dateFounded: new Date("2020-01-01T00:00:00Z") }),
      ],
      dbCorporations: [{ corporationId: 1000, allianceId: 1 }],
    });

    expect(plan.newAlliances).toEqual([]);
    expect(plan.changedAlliances).toEqual([]);
    expect(plan.closedAllianceIds).toEqual([]);
    expect(plan.missingCorporationIds).toEqual([]);
    expect(plan.corporationMoves.size).toBe(0);
  });

  it("separates new, changed, reopened and closed alliances", () => {
    const plan = planAllianceUpdates({
      esiAlliances: [
        alliance(1, { executorCorporationId: 2000 }),
        alliance(2),
        alliance(3),
      ],
      esiMemberCorporations: new Map(),
      dbAlliances: [
        alliance(1),
        alliance(3, { isDeleted: true }),
        alliance(4),
        alliance(5, { isDeleted: true }),
      ],
      dbCorporations: [],
    });

    expect(plan.newAlliances.map((a) => a.allianceId)).toEqual([2]);
    expect(plan.changedAlliances.map((a) => a.allianceId)).toEqual([1, 3]);
    // 5 is already closed, so only 4 needs marking
    expect(plan.closedAllianceIds).toEqual([4]);
  });

  it("moves corporations that joined, switched or left alliances", () => {
    const plan = planAllianceUpdates({
      esiAlliances: [alliance(1), alliance(2)],
      esiMemberCorporations: new Map([
        [1, [1000, 1001]],
        [2, [2000, 2001]],
      ]),
      dbAlliances: [alliance(1), alliance(2), alliance(9)],
      dbCorporations: [
        { corporationId: 1000, allianceId: 1 }, // unchanged
        { corporationId: 1001, allianceId: null }, // joined 1
        { corporationId: 2000, allianceId: 1 }, // switched to 2
        { corporationId: 3000, allianceId: 2 }, // left
        { corporationId: 3001, allianceId: 9 }, // its alliance closed
      ],
    });

    expect(plan.corporationMoves).toEqual(
      new Map([
        [1, [1001]],
        [2, [2000]],
        [null, [3000, 3001]],
      ]),
    );
    expect(plan.missingCorporationIds).toEqual([2001]);
  });

  it("lists executors of new or changed alliances first among missing corporations", () => {
    const plan = planAllianceUpdates({
      esiAlliances: [alliance(1, { executorCorporationId: 1500 })],
      esiMemberCorporations: new Map([[1, [1400, 1500]]]),
      dbAlliances: [],
      dbCorporations: [],
    });

    expect(plan.missingCorporationIds).toEqual([1500, 1400]);
  });
});
