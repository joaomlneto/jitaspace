/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type * as RouteModule from "../app/api/corporation/[corporationId]/route";
import type * as DataModule from "../app/corporation/[corporationId]/data";
import { splitCorporationProfile } from "~/app/corporation/[corporationId]/split";

const mockCacheLife = jest.fn();
const mockCacheTag = jest.fn();
jest.mock("next/cache", () => ({
  cacheLife: (...args: unknown[]) => mockCacheLife(...args),
  cacheTag: (...args: unknown[]) => mockCacheTag(...args),
}));

type Fn = ReturnType<typeof jest.fn<(...args: unknown[]) => Promise<unknown>>>;
const fn = (): Fn => jest.fn<(...args: unknown[]) => Promise<unknown>>();

const mockPrisma = {
  corporation: { findUnique: fn(), findUniqueOrThrow: fn(), findMany: fn() },
  solarSystem: { findUnique: fn() },
  race: { findMany: fn() },
  corporationActivity: { findMany: fn() },
  npcCorporationDivision: { findMany: fn() },
  loyaltyStoreOffer: { count: fn() },
  station: { findMany: fn() },
  agent: { findMany: fn() },
  agentType: { findMany: fn() },
  npcCorporationTrade: { findMany: fn() },
  type: { findMany: fn() },
  war: { findMany: fn(), aggregate: fn(), count: fn() },
};
jest.mock("~/lib/db", () => ({ prisma: mockPrisma }));

const loadData = () =>
  require("../app/corporation/[corporationId]/data") as typeof DataModule;

const NOW = Date.parse("2026-10-05T12:00:00Z");

const decimal = (value: number) => ({ toNumber: () => value });

/** A corporation row as `findCorporation` selects it. */
const corporationRow = (overrides: Record<string, unknown> = {}) => ({
  corporationId: 98000001,
  name: "Player Corp",
  ticker: "PLAY",
  description: null,
  url: null,
  memberCount: 10,
  taxRate: 0.1,
  dateFounded: new Date("2015-01-01T00:00:00Z"),
  ceoId: 90000001,
  ceo: { name: "Boss" },
  creatorId: null,
  creator: null,
  allianceId: null,
  alliance: null,
  enlistedFactionId: null,
  enlistedFaction: null,
  homeStationId: null,
  homeStation: null,
  shares: 1000n,
  warEligible: true,
  factionId: null,
  faction: null,
  size: null,
  sizeFactor: null,
  extent: null,
  memberLimit: null,
  minSecurity: null,
  minimumJoinStanding: null,
  initialPrice: null,
  hasPlayerPersonnelManager: null,
  sendCharTerminationMessage: null,
  isUnique: null,
  isDeletedByCcp: null,
  solarSystemId: null,
  raceId: null,
  mainActivityId: null,
  secondaryActivityId: null,
  enemyId: null,
  friendId: null,
  allowedRaces: [],
  npcDivisions: [],
  investors: [],
  investedIn: [],
  exchangeRates: [],
  ...overrides,
});

const emptyTotals = {
  _count: { warId: 0 },
  _sum: {
    aggressorShipsKilled: null,
    aggressorIskDestroyed: null,
    defenderShipsKilled: null,
    defenderIskDestroyed: null,
  },
};

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  for (const model of Object.values(mockPrisma)) {
    for (const mock of Object.values(model)) mock.mockReset();
  }
  mockCacheLife.mockReset();
  mockCacheTag.mockReset();
});

describe("readCorporationProfile", () => {
  it("is null for a corporation we have not stored", async () => {
    mockPrisma.corporation.findUnique.mockResolvedValue(null);
    await expect(loadData().readCorporationProfile(98000001)).resolves.toBe(
      null,
    );
    expect(mockCacheLife).toHaveBeenCalledWith("hours");
    expect(mockCacheTag).toHaveBeenCalledWith("sde", "corporation:98000001");
  });

  it("reads a player corporation's wars, and no NPC tables", async () => {
    mockPrisma.corporation.findUnique.mockResolvedValue(corporationRow());
    mockPrisma.war.findMany.mockResolvedValue([
      {
        warId: 1,
        aggressorAllianceId: null,
        aggressorCorporationId: null,
        defenderAllianceId: null,
        defenderCorporationId: 98000001,
        aggressorShipsKilled: 2,
        aggressorIskDestroyed: 20,
        defenderShipsKilled: 3,
        defenderIskDestroyed: 30,
        declaredDate: new Date("2026-09-01T00:00:00Z"),
        startedDate: new Date("2026-09-02T00:00:00Z"),
        finishedDate: null,
        retractedDate: null,
        isMutual: false,
        isOpenForAllies: true,
        _count: { allianceAllies: 0, corporationAllies: 1 },
      },
    ]);
    mockPrisma.war.aggregate
      .mockResolvedValueOnce(emptyTotals)
      .mockResolvedValueOnce({
        _count: { warId: 1 },
        _sum: {
          aggressorShipsKilled: 2,
          aggressorIskDestroyed: 20,
          defenderShipsKilled: 3,
          defenderIskDestroyed: 30,
        },
      });
    mockPrisma.war.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);

    const profile = await loadData().readCorporationProfile(98000001);

    expect(profile).toMatchObject({
      name: "Player Corp",
      ceo: { id: 90000001, name: "Boss" },
      creator: null,
      shares: "1000",
      npc: null,
      stations: [],
      agents: [],
      trades: [],
      warSummary: {
        total: 1,
        asDefender: 1,
        ongoing: 1,
        shipsKilled: 3,
        shipsLost: 2,
      },
    });
    expect(profile?.wars[0]).toMatchObject({ role: "defender", allyCount: 1 });
    // The corporation's own wars, not its alliance's.
    expect(mockPrisma.war.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { aggressorCorporationId: 98000001 },
            { defenderCorporationId: 98000001 },
            { corporationAllies: { some: { corporationId: 98000001 } } },
          ],
        },
      }),
    );
    expect(mockPrisma.station.findMany).not.toHaveBeenCalled();
    // Player corporations skip the NPC-only relations query entirely.
    expect(mockPrisma.corporation.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("names an NPC corporation's references and reads its tables", async () => {
    mockPrisma.corporation.findUnique.mockResolvedValue(
      corporationRow({
        corporationId: 1000035,
        name: "Caldari Navy",
        factionId: 500001,
        faction: { name: "Caldari State" },
        size: "H",
        solarSystemId: 30000142,
        raceId: 1,
        mainActivityId: 3,
        secondaryActivityId: 9,
        enemyId: 1000120,
        friendId: 1000044,
        allowedRaces: [{ raceId: 1 }, { raceId: 8 }],
        npcDivisions: [
          { npcCorporationDivisionId: 22, size: 3, leaderId: 3000001 },
          { npcCorporationDivisionId: 99, size: null, leaderId: null },
        ],
        investors: [
          {
            investorCorporationId: 1000003,
            shares: 100,
            investor: { name: "Small" },
          },
          {
            investorCorporationId: 1000002,
            shares: 300,
            investor: { name: "Big" },
          },
        ],
        investedIn: [
          { corporationId: 1000005, shares: 5, corporation: { name: "Sub" } },
        ],
        exchangeRates: [
          { otherCorporationId: 1000004, rate: 0.75, other: { name: "Y" } },
        ],
      }),
    );
    // The NPC-only relations come from their own query.
    mockPrisma.corporation.findUniqueOrThrow.mockImplementation(() =>
      mockPrisma.corporation.findUnique(),
    );
    mockPrisma.solarSystem.findUnique.mockResolvedValue({
      solarSystemId: 30000142,
      name: "Jita",
      securityStatus: decimal(0.95),
      constellation: { regionId: 10000002, region: { name: "The Forge" } },
    });
    mockPrisma.race.findMany.mockResolvedValue([
      { raceId: 1, name: "Caldari" },
      { raceId: 8, name: "Gallente" },
    ]);
    mockPrisma.corporationActivity.findMany.mockResolvedValue([
      { corporationActivityId: 3, name: "Military" },
    ]);
    mockPrisma.corporation.findMany.mockResolvedValue([
      { corporationId: 1000120, name: "Enemy Corp" },
    ]);
    // Two division queries run concurrently: the overview's names (which
    // select `displayName`) and the agents table's labels. Answer by shape.
    mockPrisma.npcCorporationDivision.findMany.mockImplementation((args) =>
      Promise.resolve(
        (args as { select: Record<string, boolean> }).select.displayName
          ? [
              {
                npcCorporationDivisionId: 22,
                name: "distribution",
                displayName: "Distribution",
              },
            ]
          : [
              { npcCorporationDivisionId: 22, name: "Distribution" },
              { npcCorporationDivisionId: 23, name: "Unused" },
            ],
      ),
    );
    mockPrisma.loyaltyStoreOffer.count.mockResolvedValue(120);
    mockPrisma.station.findMany.mockResolvedValue([
      {
        stationId: 2,
        name: "Zeta Station",
        typeId: 1531,
        reprocessingEfficiency: 0.5,
        officeRentalCost: null,
        solarSystem: null,
      },
      {
        stationId: 1,
        name: "Alpha Station",
        typeId: 1531,
        reprocessingEfficiency: 0.5,
        officeRentalCost: 1e6,
        solarSystem: {
          solarSystemId: 30000142,
          name: "Jita",
          securityStatus: decimal(0.95),
          constellation: { regionId: 10000002, region: { name: "The Forge" } },
        },
      },
    ]);
    mockPrisma.agent.findMany.mockResolvedValue([
      {
        characterId: 1,
        Character: { name: "B Agent" },
        agentTypeId: 2,
        agentDivisionId: 22,
        isLocator: false,
        level: 1,
        stationId: 1,
      },
      {
        characterId: 2,
        Character: { name: "A Agent" },
        agentTypeId: 2,
        agentDivisionId: 22,
        isLocator: true,
        level: 4,
        stationId: 1,
      },
    ]);
    mockPrisma.agentType.findMany.mockResolvedValue([
      { agentTypeId: 2, name: "BasicAgent" },
      { agentTypeId: 3, name: "Unused" },
    ]);
    mockPrisma.npcCorporationTrade.findMany.mockResolvedValue([
      { typeId: 35, value: 2 },
      { typeId: 34, value: 1 },
    ]);
    mockPrisma.type.findMany.mockResolvedValue([
      { typeId: 34, name: "Tritanium" },
    ]);

    const profile = await loadData().readCorporationProfile(1000035);

    expect(profile?.npc).toMatchObject({
      faction: { id: 500001, name: "Caldari State" },
      headquarters: {
        name: "Jita",
        securityStatus: 0.95,
        regionName: "The Forge",
      },
      race: { id: 1, name: "Caldari" },
      allowedRaces: [
        { id: 1, name: "Caldari" },
        { id: 8, name: "Gallente" },
      ],
      mainActivity: "Military",
      // An activity id the table does not know stays unnamed.
      secondaryActivity: null,
      enemy: { id: 1000120, name: "Enemy Corp" },
      friend: { id: 1000044, name: null },
      lpOffers: 120,
    });
    expect(profile?.npc?.divisions.map((d) => d.name)).toEqual([
      "Distribution",
      "Division 99",
    ]);
    // Largest shareholder first.
    expect(profile?.npc?.investors.map((i) => i.name)).toEqual([
      "Big",
      "Small",
    ]);
    expect(profile?.stations.map((s) => s.name)).toEqual([
      "Alpha Station",
      "Zeta Station",
    ]);
    expect(profile?.stations[1]).toMatchObject({
      solarSystemId: null,
      securityStatus: null,
    });
    // Highest level first, then by name.
    expect(profile?.agents.map((a) => a.name)).toEqual(["A Agent", "B Agent"]);
    expect(profile?.agentTypes).toEqual([
      { agentTypeId: 2, name: "BasicAgent" },
    ]);
    expect(profile?.agentDivisions).toEqual([
      { npcCorporationDivisionId: 22, name: "Distribution" },
    ]);
    expect(profile?.trades).toEqual([
      { typeId: 34, typeName: "Tritanium", value: 1 },
      { typeId: 35, typeName: "Type 35", value: 2 },
    ]);
    // NPC corporations do not go to war: no war queries.
    expect(mockPrisma.war.findMany).not.toHaveBeenCalled();
    expect(profile?.warSummary.total).toBe(0);
  });
});

describe("loadCorporationProfile", () => {
  it("reports a database failure instead of throwing", async () => {
    mockPrisma.corporation.findUnique.mockRejectedValue(new Error("down"));
    await expect(loadData().loadCorporationProfile(98000001)).resolves.toEqual({
      ok: false,
    });
  });
});

describe("splitCorporationProfile", () => {
  it("keeps the rows out of the page and counts them", () => {
    const profile = {
      ...(corporationRow() as unknown as Parameters<
        typeof splitCorporationProfile
      >[0]),
      stations: [{ stationId: 1 }],
      agents: [{ characterId: 1 }, { characterId: 2 }],
      agentTypes: [],
      agentDivisions: [],
      trades: [],
      wars: [],
    } as unknown as Parameters<typeof splitCorporationProfile>[0];
    const { page, tables } = splitCorporationProfile(profile);
    expect(page.counts).toEqual({
      stations: 1,
      agents: 2,
      trades: 0,
      listedWars: 0,
    });
    expect(page).not.toHaveProperty("agents");
    expect(tables.agents).toHaveLength(2);
  });
});

describe("GET /api/corporation/[corporationId]", () => {
  const get = (corporationId: string) =>
    (
      require("../app/api/corporation/[corporationId]/route") as typeof RouteModule
    ).GET(
      new Request(`https://www.jita.space/api/corporation/${corporationId}`),
      {
        params: Promise.resolve({ corporationId }),
      },
    );

  it("rejects an id that is not the canonical spelling", async () => {
    const res = await get("098000001");
    expect(res.status).toBe(400);
    expect(mockPrisma.corporation.findUnique).not.toHaveBeenCalled();
  });

  it("404s a corporation we have not stored", async () => {
    mockPrisma.corporation.findUnique.mockResolvedValue(null);
    const res = await get("98000001");
    expect(res.status).toBe(404);
  });

  it("serves only the table rows, cached at the CDN", async () => {
    mockPrisma.corporation.findUnique.mockResolvedValue(corporationRow());
    mockPrisma.war.findMany.mockResolvedValue([]);
    mockPrisma.war.aggregate.mockResolvedValue(emptyTotals);
    mockPrisma.war.count.mockResolvedValue(0);
    const res = await get("98000001");

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage=3600");
    expect(Object.keys((await res.json()) as object).sort()).toEqual([
      "agentDivisions",
      "agentTypes",
      "agents",
      "stations",
      "trades",
      "wars",
    ]);
  });
});
