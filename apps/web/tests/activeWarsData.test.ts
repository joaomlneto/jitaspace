import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type { WarRoomData } from "~/components/Wars/WarRoom/types";

// data.ts reads wars from the DB-backed prisma client; stub it so we can drive
// the pure enrichment/aggregation with fixed rows. next/cache is stubbed globally
// (moduleNameMapper) so the "use cache" directive is inert here.
const mockFindMany = jest.fn<() => Promise<unknown[]>>();
jest.mock("~/lib/db", () => ({
  prisma: { war: { findMany: (...args: unknown[]) => mockFindMany(...args) } },
}));

const DAY = 86_400_000;
const now = Date.now();
const d = (offsetDays: number) => new Date(now + offsetDays * DAY);

interface RawWar {
  warId: number;
  aggressorCorporationId: number | null;
  aggressorAllianceId: number | null;
  aggressorIskDestroyed: number;
  aggressorShipsKilled: number;
  allianceAllies: { allianceId: number }[];
  corporationAllies: { corporationId: number }[];
  declaredDate: Date;
  defenderCorporationId: number | null;
  defenderAllianceId: number | null;
  defenderIskDestroyed: number;
  defenderShipsKilled: number;
  startedDate: Date | null;
  finishedDate: Date | null;
  isMutual: boolean;
  isOpenForAllies: boolean;
  retractedDate: Date | null;
  updatedAt: Date;
}

function rawWar(overrides: Partial<RawWar>): RawWar {
  return {
    warId: 0,
    aggressorCorporationId: null,
    aggressorAllianceId: null,
    aggressorIskDestroyed: 0,
    aggressorShipsKilled: 0,
    allianceAllies: [],
    corporationAllies: [],
    declaredDate: d(-3),
    defenderCorporationId: null,
    defenderAllianceId: null,
    defenderIskDestroyed: 0,
    defenderShipsKilled: 0,
    startedDate: d(-5),
    finishedDate: null,
    isMutual: false,
    isOpenForAllies: false,
    retractedDate: null,
    updatedAt: d(-1),
    ...overrides,
  };
}

const RAW: RawWar[] = [
  // 1 — active, alliance aggressor leading, mutual, open, allies, combat
  rawWar({
    warId: 1,
    aggressorAllianceId: 1001,
    aggressorIskDestroyed: 100e9,
    aggressorShipsKilled: 100,
    defenderCorporationId: 2001,
    defenderIskDestroyed: 40e9,
    defenderShipsKilled: 40,
    startedDate: d(-10),
    finishedDate: d(30),
    declaredDate: d(-10),
    isMutual: true,
    isOpenForAllies: true,
    allianceAllies: [{ allianceId: 3001 }],
    corporationAllies: [{ corporationId: 3002 }],
  }),
  // 2 — active, corp aggressor, defender leading, declared within 24h
  rawWar({
    warId: 2,
    aggressorCorporationId: 1002,
    aggressorIskDestroyed: 20e9,
    aggressorShipsKilled: 20,
    defenderAllianceId: 2002,
    defenderIskDestroyed: 80e9,
    defenderShipsKilled: 80,
    startedDate: d(-2),
    declaredDate: d(-0.5),
  }),
  // 3 — starting (no start date), no combat
  rawWar({
    warId: 3,
    aggressorCorporationId: 1003,
    defenderCorporationId: 2003,
    startedDate: null,
    declaredDate: d(-3),
  }),
  // 4 — starting (start date in the future)
  rawWar({
    warId: 4,
    aggressorCorporationId: 1004,
    defenderCorporationId: 2004,
    startedDate: d(1),
    declaredDate: d(-3),
  }),
  // 5 — ending (retracted in the past), even combat
  rawWar({
    warId: 5,
    aggressorAllianceId: 1005,
    aggressorIskDestroyed: 5e9,
    aggressorShipsKilled: 5,
    defenderCorporationId: 2005,
    defenderIskDestroyed: 5e9,
    defenderShipsKilled: 5,
    startedDate: d(-20),
    retractedDate: d(-1),
    declaredDate: d(-10),
  }),
  // 6 — active, no combat
  rawWar({
    warId: 6,
    aggressorCorporationId: 1006,
    defenderCorporationId: 2006,
    startedDate: d(-5),
    declaredDate: d(-10),
  }),
  // 7 — aggressor with neither corp nor alliance id (skipped in leaderboard)
  rawWar({
    warId: 7,
    defenderCorporationId: 2007,
    startedDate: d(-1),
    declaredDate: d(-3),
  }),
  // 8 — second war for alliance 1001 (grouping + tiebreak)
  rawWar({
    warId: 8,
    aggressorAllianceId: 1001,
    aggressorIskDestroyed: 10e9,
    aggressorShipsKilled: 10,
    defenderCorporationId: 2008,
    startedDate: d(-1),
    declaredDate: d(-0.4),
  }),
];

function load(): Promise<WarRoomData> {
  const { getWarRoomData } = require("~/app/active-wars/data");
  return getWarRoomData();
}

describe("getWarRoomData", () => {
  beforeEach(() => {
    mockFindMany.mockReset();
    mockFindMany.mockResolvedValue(RAW);
  });

  it("derives lifecycle status for every war", async () => {
    const { wars } = await load();
    const byId = Object.fromEntries(
      wars.map((w: { warId: number }) => [w.warId, w]),
    );
    expect(byId[1].status).toBe("active");
    expect(byId[3].status).toBe("pending"); // no start date
    expect(byId[4].status).toBe("pending"); // future start date
    expect(byId[5].status).toBe("retracting"); // retracted in the past
    expect(byId[6].status).toBe("active");
  });

  it("enriches totals, ISK share, age and allies", async () => {
    const { wars } = await load();
    const byId = Object.fromEntries(
      wars.map((w: { warId: number }) => [w.warId, w]),
    );

    // war 1: 140B destroyed, aggressor share 100/140
    expect(byId[1].totalIskDestroyed).toBe(140e9);
    expect(byId[1].totalShipsKilled).toBe(140);
    expect(byId[1].aggressorIskShare).toBeCloseTo(100 / 140, 5);
    expect(byId[1].ageDays).toBeGreaterThan(9);
    expect(byId[1].allianceAllies).toEqual([3001]);
    expect(byId[1].corporationAllies).toEqual([3002]);
    expect(byId[1].aggressorAllianceId).toBe(1001);
    expect(byId[1].aggressorCorporationId).toBeUndefined();

    // starting war: no age, no combat share
    expect(byId[3].ageDays).toBe(0);
    expect(byId[3].aggressorIskShare).toBeNull();

    // dates are serialised to ISO strings
    expect(typeof byId[1].declaredDate).toBe("string");
  });

  it("sorts wars by total ISK destroyed and drops hotspots", async () => {
    const data = await load();
    expect(data.wars[0].warId).toBe(1); // 140B is the largest
    expect("hotspots" in data).toBe(false);
  });

  it("computes aggregate stats", async () => {
    const { stats } = await load();
    expect(stats.totalActive).toBe(8);
    expect(stats.activeCount).toBe(5); // 1,2,6,7,8
    expect(stats.startingCount).toBe(2); // 3,4
    expect(stats.endingCount).toBe(1); // 5
    expect(stats.mutualCount).toBe(1);
    expect(stats.openForAlliesCount).toBe(1);
    expect(stats.warsWithCombat).toBe(4); // 1,2,5,8
    expect(stats.totalIskDestroyed).toBe(260e9);
    expect(stats.totalShipsKilled).toBe(260);
    expect(stats.declaredLast24h).toBe(2); // 2,8
    expect(stats.declaredLast7d).toBe(5); // 2,3,4,7,8
    expect(typeof stats.generatedAt).toBe("string");
  });

  it("builds the aggressor leaderboard, grouping and skipping id-less sides", async () => {
    const { topAggressors } = await load();
    // alliance 1001 prosecutes wars 1 and 8 → top by war count
    expect(topAggressors[0]).toMatchObject({
      allianceId: 1001,
      warCount: 2,
      iskDestroyed: 110e9,
    });
    // war 7 has no aggressor id → excluded, so 6 distinct aggressors remain
    expect(topAggressors).toHaveLength(6);
    expect(
      topAggressors.every(
        (a: { corporationId?: number; allianceId?: number }) =>
          a.corporationId != null || a.allianceId != null,
      ),
    ).toBe(true);
  });

  it("returns an empty aggregate for no wars", async () => {
    mockFindMany.mockResolvedValue([]);
    const data = await load();
    expect(data.wars).toEqual([]);
    expect(data.topAggressors).toEqual([]);
    expect(data.stats.totalActive).toBe(0);
  });
});
