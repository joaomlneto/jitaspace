/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type * as DataModule from "../app/alliance/[allianceId]/data";

const mockCacheLife = jest.fn();
const mockCacheTag = jest.fn();
jest.mock("next/cache", () => ({
  cacheLife: (...args: unknown[]) => mockCacheLife(...args),
  cacheTag: (...args: unknown[]) => mockCacheTag(...args),
}));

const mockPrisma = {
  alliance: { findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>() },
  corporation: {
    findMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  },
  solarSystemSovereignty: {
    findMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  },
  war: {
    findMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    aggregate: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    count: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  },
};
jest.mock("~/lib/db", () => ({ prisma: mockPrisma }));

const loadData = () =>
  require("../app/alliance/[allianceId]/data") as typeof DataModule;

const ALLIANCE_ID = 99000001;
const NOW = Date.parse("2026-10-05T12:00:00Z");
const day = (offset: number) => new Date(NOW + offset * 24 * 3600 * 1000);

const rawWar = (overrides: Record<string, unknown>) => ({
  warId: 1,
  aggressorAllianceId: null,
  aggressorCorporationId: null,
  defenderAllianceId: null,
  defenderCorporationId: null,
  aggressorShipsKilled: 0,
  aggressorIskDestroyed: 0,
  defenderShipsKilled: 0,
  defenderIskDestroyed: 0,
  declaredDate: day(-10),
  startedDate: day(-9),
  finishedDate: null,
  retractedDate: null,
  isMutual: false,
  isOpenForAllies: false,
  _count: { allianceAllies: 1, corporationAllies: 2 },
  ...overrides,
});

const totals = (count: number, sums: Record<string, number | null>) => ({
  _count: { warId: count },
  _sum: sums,
});

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  for (const model of Object.values(mockPrisma)) {
    for (const fn of Object.values(model)) fn.mockReset();
  }
  mockCacheLife.mockReset();
  mockCacheTag.mockReset();
});

describe("deriveWarStatus", () => {
  const { deriveWarStatus } = loadData();
  const at = (overrides: Record<string, Date | null>) =>
    deriveWarStatus(
      {
        startedDate: day(-1),
        finishedDate: null,
        retractedDate: null,
        ...overrides,
      },
      NOW,
    );

  it("walks a war through its lifecycle", () => {
    expect(at({ startedDate: null })).toBe("pending");
    expect(at({ startedDate: day(1) })).toBe("pending");
    expect(at({})).toBe("active");
    expect(at({ retractedDate: day(-0.5), finishedDate: day(1) })).toBe(
      "retracting",
    );
    expect(at({ finishedDate: day(-0.5) })).toBe("finished");
  });
});

describe("readAllianceProfile", () => {
  it("is null for an alliance we have not stored", async () => {
    mockPrisma.alliance.findUnique.mockResolvedValue(null);
    await expect(loadData().readAllianceProfile(ALLIANCE_ID)).resolves.toBe(
      null,
    );
    expect(mockCacheTag).toHaveBeenCalledWith(
      "alliances",
      `alliance:${ALLIANCE_ID}`,
    );
    expect(mockCacheLife).toHaveBeenCalledWith("hours");
    expect(mockPrisma.corporation.findMany).not.toHaveBeenCalled();
  });

  it("assembles members, sovereignty and wars into a serializable profile", async () => {
    mockPrisma.alliance.findUnique.mockResolvedValue({
      allianceId: ALLIANCE_ID,
      name: "Test Alliance",
      ticker: "TEST",
      dateFounded: new Date("2010-05-01T10:00:00Z"),
      isDeleted: false,
      creatorCorporationId: 98000001,
      creatorCorporation: { name: "Founders" },
      executorCorporationId: 98000002,
      executorCorporation: { name: "Exec Corp" },
      factionId: null,
      faction: null,
    });
    mockPrisma.corporation.findMany.mockResolvedValue([
      {
        corporationId: 98000002,
        name: "Exec Corp",
        ticker: "EXEC",
        memberCount: 10,
        ceoId: 90000001,
        ceo: null,
        dateFounded: null,
        taxRate: 0.1,
        warEligible: true,
        enlistedFactionId: null,
        homeStationId: 60003760,
        homeStation: { name: "Jita IV - Moon 4" },
        url: null,
      },
    ]);
    mockPrisma.solarSystemSovereignty.findMany.mockResolvedValue([
      {
        solarSystemId: 30000002,
        corporationId: 98000002,
        claimedSince: new Date("2020-01-01T00:00:00Z"),
        isCapitalSystem: null,
        sovereigntyHubId: 1000000000001n,
        vulnerabilityWindowStart: null,
        vulnerabilityWindowEnd: null,
        activityDefenseMultiplier: 2,
        militaryLevel: 1,
        industrialLevel: 2,
        strategicLevel: 3,
        solarSystem: {
          name: "Zulu",
          securityStatus: { toNumber: () => -0.5 },
          constellationId: 20000001,
          constellation: {
            name: "C",
            regionId: 10000001,
            region: { name: "R" },
          },
        },
      },
      {
        solarSystemId: 30000001,
        corporationId: null,
        claimedSince: null,
        isCapitalSystem: true,
        sovereigntyHubId: null,
        vulnerabilityWindowStart: new Date("2026-10-05T18:00:00Z"),
        vulnerabilityWindowEnd: new Date("2026-10-05T22:00:00Z"),
        activityDefenseMultiplier: null,
        militaryLevel: null,
        industrialLevel: null,
        strategicLevel: null,
        solarSystem: {
          name: "Alpha",
          securityStatus: { toNumber: () => -0.1 },
          constellationId: 20000002,
          constellation: { name: "D", regionId: 10000002, region: null },
        },
      },
    ]);
    mockPrisma.war.findMany.mockResolvedValue([
      rawWar({ warId: 1, aggressorAllianceId: ALLIANCE_ID }),
      rawWar({ warId: 2, defenderAllianceId: ALLIANCE_ID }),
      rawWar({
        warId: 3,
        defenderAllianceId: 1,
        finishedDate: day(-1),
        startedDate: null,
      }),
    ]);
    mockPrisma.war.aggregate
      // As aggressor: we killed 5 ships worth 50, lost 1 worth 10.
      .mockResolvedValueOnce(
        totals(2, {
          aggressorShipsKilled: 5,
          aggressorIskDestroyed: 50,
          defenderShipsKilled: 1,
          defenderIskDestroyed: 10,
        }),
      )
      // As defender: we killed 3 ships worth 30, lost 4 worth 40.
      .mockResolvedValueOnce(
        totals(1, {
          aggressorShipsKilled: 4,
          aggressorIskDestroyed: 40,
          defenderShipsKilled: 3,
          defenderIskDestroyed: 30,
        }),
      );
    mockPrisma.war.count
      .mockResolvedValueOnce(4) // as ally
      .mockResolvedValueOnce(2); // unfinished

    const profile = await loadData().readAllianceProfile(ALLIANCE_ID);

    expect(profile).toMatchObject({
      name: "Test Alliance",
      dateFounded: "2010-05-01T10:00:00.000Z",
      isClosed: false,
      creatorCorporationName: "Founders",
      executorCorporationName: "Exec Corp",
      factionName: null,
      readAt: "2026-10-05T12:00:00.000Z",
      warSummary: {
        total: 7,
        asAggressor: 2,
        asDefender: 1,
        asAlly: 4,
        ongoing: 2,
        shipsKilled: 8,
        iskDestroyed: 80,
        shipsLost: 5,
        iskLost: 50,
      },
    });
    expect(profile?.corporations[0]).toMatchObject({
      ceoName: null,
      dateFounded: null,
      homeStationName: "Jita IV - Moon 4",
    });
    // Sorted by name; BigInt and Decimal become JSON-safe values.
    expect(profile?.sovereignty.map((system) => system.name)).toEqual([
      "Alpha",
      "Zulu",
    ]);
    expect(profile?.sovereignty[1]).toMatchObject({
      securityStatus: -0.5,
      sovereigntyHubId: "1000000000001",
      isCapitalSystem: false,
      claimedSince: "2020-01-01T00:00:00.000Z",
    });
    expect(profile?.sovereignty[0]).toMatchObject({
      isCapitalSystem: true,
      regionName: null,
      vulnerabilityWindowEnd: "2026-10-05T22:00:00.000Z",
    });
    expect(
      profile?.wars.map((war) => [war.warId, war.role, war.status]),
    ).toEqual([
      [1, "aggressor", "active"],
      [2, "defender", "active"],
      [3, "ally", "finished"],
    ]);
    expect(profile?.wars[0]?.allyCount).toBe(3);
    // The listing is capped; the summary is not.
    expect(mockPrisma.war.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: loadData().ALLIANCE_WAR_LIST_LIMIT }),
    );
  });
});

describe("loadAllianceProfile", () => {
  it("reports a database failure instead of throwing", async () => {
    mockPrisma.alliance.findUnique.mockRejectedValue(new Error("down"));
    await expect(loadData().loadAllianceProfile(ALLIANCE_ID)).resolves.toEqual({
      ok: false,
    });
  });

  it("passes an unstored alliance through as a good read", async () => {
    mockPrisma.alliance.findUnique.mockResolvedValue(null);
    await expect(loadData().loadAllianceProfile(ALLIANCE_ID)).resolves.toEqual({
      ok: true,
      profile: null,
    });
  });
});
