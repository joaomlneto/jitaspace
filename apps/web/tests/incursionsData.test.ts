/** @jest-environment node */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type * as HistoryRoute from "~/app/api/incursions/history/route";
import type * as IncursionsDataModule from "~/app/incursions/data";

// The /incursions reads, against a stubbed Prisma: each model's findMany
// answers from the fixtures below by looking at the `where` it was given.

type Row = Record<string, unknown>;
type Where = Record<string, unknown> | undefined;
const findMany = (rows: (where: Where) => Row[]) =>
  jest.fn((args?: unknown) =>
    Promise.resolve(rows((args as { where?: Where } | undefined)?.where)),
  );

const at = (iso: string) => new Date(iso);
const incursion = (overrides: Row): Row => ({
  incursionId: 1,
  constellationId: 20000001,
  factionId: 500019,
  type: "Incursion",
  source: "esi",
  stagingSolarSystemId: 30000001,
  stagingSovereigntyAllianceId: null,
  stagingSovereigntyFactionId: 500004,
  state: "mobilizing",
  influence: 1,
  hasBoss: true,
  firstSeenAt: at("2026-10-05T08:10:00Z"),
  lastSeenAt: at("2026-10-08T11:55:00Z"),
  endedAt: null,
  isObservedFromStart: true,
  establishedAt: at("2026-10-05T08:10:00Z"),
  mobilizingAt: at("2026-10-07T22:37:00Z"),
  withdrawingAt: null,
  infestedSolarSystems: [
    { solarSystemId: 30000003 },
    { solarSystemId: 30000001 },
  ],
  ...overrides,
});

const ACTIVE = incursion({});
const RECENTLY_ENDED = incursion({
  incursionId: 2,
  constellationId: 20000002,
  stagingSolarSystemId: 30000100,
  stagingSovereigntyAllianceId: 99000001,
  stagingSovereigntyFactionId: null,
  state: "withdrawing",
  endedAt: at("2026-10-07T10:00:00Z"),
  infestedSolarSystems: [],
});
// Named only by an event in the change list.
const OLD = incursion({
  incursionId: 3,
  constellationId: 20000003,
  source: "eve_incursions_de",
  stagingSolarSystemId: null,
  stagingSovereigntyFactionId: null,
  influence: null,
  hasBoss: null,
  endedAt: at("2023-01-01T00:00:00Z"),
  infestedSolarSystems: [],
});

const incursionFindMany = findMany((where) => {
  if (where?.endedAt === null) return [ACTIVE];
  const endedAt = where?.endedAt as Row | undefined;
  if (endedAt && "gte" in endedAt) return [RECENTLY_ENDED];
  if (endedAt && "not" in endedAt) return [RECENTLY_ENDED, OLD];
  const ids = (where?.incursionId as { in: number[] } | undefined)?.in ?? [];
  return [ACTIVE, RECENTLY_ENDED, OLD].filter((i) =>
    ids.includes(i.incursionId as number),
  );
});
const incursionEventFindMany = findMany((where) => {
  const observedAt = where?.observedAt as Row | undefined;
  if (observedAt && "lt" in observedAt) {
    return [
      {
        incursionId: 1,
        observedAt: at("2026-10-01T00:00:00Z"),
        influence: 0.5,
      },
    ];
  }
  if (observedAt && "gte" in observedAt) {
    return [
      { incursionId: 1, observedAt: at("2026-10-08T11:00:00Z"), influence: 1 },
      {
        incursionId: 1,
        observedAt: at("2026-10-08T11:30:00Z"),
        influence: null,
      },
    ];
  }
  // The spawn history's state events.
  return [
    {
      eventId: 5,
      incursionId: 1,
      observedAt: at("2026-10-07T22:37:00Z"),
      kind: "state_changed",
      state: "mobilizing",
    },
    {
      eventId: 4,
      incursionId: 2,
      observedAt: at("2026-10-07T10:00:00Z"),
      kind: "ended",
      state: "withdrawing",
    },
  ];
});

const models = {
  incursion: { findMany: incursionFindMany },
  incursionEvent: { findMany: incursionEventFindMany },
  constellation: {
    findMany: findMany(() => [
      { constellationId: 20000001, name: "Agiesseson", regionId: 10000001 },
      { constellationId: 20000002, name: "0KTC-R", regionId: 10000002 },
    ]),
  },
  region: {
    findMany: findMany(() => [
      { regionId: 10000001, name: "Sinq Laison" },
      { regionId: 10000002, name: "Venal" },
    ]),
  },
  solarSystem: {
    findMany: findMany(() => [
      { solarSystemId: 30000001, name: "Claysson", securityStatus: "0.9" },
      { solarSystemId: 30000003, name: "Adiere", securityStatus: "0.8" },
      { solarSystemId: 30000100, name: "ZD4-G9", securityStatus: "-0.3" },
    ]),
  },
  faction: {
    findMany: findMany(() => [{ factionId: 500019, name: "Sansha's Nation" }]),
  },
  alliance: {
    findMany: findMany(() => [{ allianceId: 99000001, name: "Test Alliance" }]),
  },
  solarSystemSovereignty: {
    findMany: findMany(() => [
      { solarSystemId: 30000001, allianceId: null, factionId: 500004 },
    ]),
  },
  // Each celestial 1 AU (1.496e11 m) from the star on its own axis.
  planet: {
    findMany: findMany(() => [
      {
        solarSystemId: 30000001,
        positionX: 1.495978707e11,
        positionY: 0,
        positionZ: 0,
      },
      { solarSystemId: 30000001, positionX: null, positionY: 0, positionZ: 0 },
    ]),
  },
  stargate: {
    findMany: findMany(() => [
      {
        solarSystemId: 30000001,
        positionX: -1.495978707e11,
        positionY: 0,
        positionZ: 0,
      },
    ]),
  },
  station: {
    findMany: findMany((where) =>
      "isDeleted" in (where ?? {})
        ? [
            {
              stationId: 60000001,
              name: "Claysson IV",
              solarSystemId: 30000001,
              operationId: 7,
            },
            {
              stationId: 60000002,
              name: "Claysson V",
              solarSystemId: 30000001,
              operationId: null,
            },
          ]
        : [],
    ),
  },
  stationService: { findMany: findMany(() => [{ stationServiceId: 16 }]) },
  stationOperationService: {
    findMany: findMany(() => [{ stationOperationId: 7 }]),
  },
  group: {
    findMany: findMany(() => [
      { groupId: 1056, name: "Incursion Sansha's Nation Battleship" },
    ]),
  },
  type: {
    findMany: findMany(() => [
      { typeId: 3484, name: "Citizen Astur", groupId: 1056 },
      { typeId: 3485, name: "Unknown Rat", groupId: 1054 },
    ]),
  },
};

jest.mock("~/lib/db", () => ({ prisma: models }));
jest.mock("~/lib/sdeCache", () => ({
  cacheSdeRead: () => undefined,
  SDE_CACHE_TAG: "sde",
}));
const readNpcStats = jest.fn((_ids: number[]) =>
  Promise.resolve(new Map([[3484, { marker: "stats of 3484" }]])),
);
jest.mock("~/lib/npcStatsData", () => ({
  readNpcStats: (ids: number[]) => readNpcStats(ids),
}));

const loadData = () =>
  require("~/app/incursions/data") as typeof IncursionsDataModule;

beforeEach(() => {
  jest.useFakeTimers({ now: new Date("2026-10-08T12:00:00Z") });
});

describe("readIncursionsData", () => {
  it("returns active and recently ended incursions as rows", async () => {
    const data = await loadData().readIncursionsData();
    expect(data.readAt).toBe("2026-10-08T12:00:00.000Z");
    expect(data.incursions.map((i) => i.incursionId)).toEqual([1, 2]);
    expect(data.incursions[0]).toMatchObject({
      infestedSolarSystemIds: [30000001, 30000003],
      firstSeenAt: "2026-10-05T08:10:00.000Z",
      withdrawingAt: null,
    });
  });

  it("reads no change list, so the page never sends one", async () => {
    const data = await loadData().readIncursionsData();
    expect(data).not.toHaveProperty("events");
    expect(data).not.toHaveProperty("eventIncursions");
    // Every event read is the influence chart's: filtered to influence.
    for (const [args] of incursionEventFindMany.mock.calls) {
      expect(args).toMatchObject({ select: { influence: true } });
    }
  });

  it("carries the influence before the chart's window and the changes in it", async () => {
    const data = await loadData().readIncursionsData();
    expect(data.influence[1]).toEqual([
      [Date.parse("2026-10-01T00:00:00Z"), 0.5],
      [Date.parse("2026-10-08T11:00:00Z"), 1],
    ]);
  });

  it("gives active systems their size and stations, repair marked", async () => {
    const data = await loadData().readIncursionsData();
    const claysson = data.solarSystems[30000001];
    expect(claysson?.securityStatus).toBe(0.9);
    expect(claysson?.longestWarpAu).toBeCloseTo(2);
    expect(claysson?.stations).toEqual([
      { stationId: 60000001, name: "Claysson IV", hasRepair: true },
      { stationId: 60000002, name: "Claysson V", hasRepair: false },
    ]);
    // An ended incursion's staging system gets neither.
    expect(data.solarSystems[30000100]).not.toHaveProperty("stations");
  });

  it("names constellations, regions, factions, alliances and sovereignty", async () => {
    const data = await loadData().readIncursionsData();
    expect(data.constellations[20000001]).toEqual({
      name: "Agiesseson",
      regionId: 10000001,
    });
    expect(data.regions[10000002]).toBe("Venal");
    expect(data.factions[500019]).toBe("Sansha's Nation");
    expect(data.alliances[99000001]).toBe("Test Alliance");
    expect(data.currentSovereignty[30000001]).toEqual({
      allianceId: null,
      factionId: 500004,
    });
  });
});

describe("readIncursionHistory", () => {
  it("lists every ended incursion, the active ones with state events, and the events", async () => {
    const history = await loadData().readIncursionHistory();
    expect(history.incursions.map((i) => i.incursionId)).toEqual([2, 3, 1]);
    expect(history.stateEvents).toEqual([
      [5, 1, "2026-10-07T22:37:00.000Z", "state_changed", "mobilizing"],
      [4, 2, "2026-10-07T10:00:00.000Z", "ended", "withdrawing"],
    ]);
    expect(history.constellations[20000002]?.name).toBe("0KTC-R");
  });

  it("is served as cacheable JSON by /api/incursions/history", async () => {
    const { GET } =
      require("~/app/api/incursions/history/route") as typeof HistoryRoute;
    const response = await GET();
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=300");
    const body = (await response.json()) as { incursions: unknown[] };
    expect(body.incursions).toHaveLength(3);
  });
});

describe("readIncursionRats", () => {
  it("groups the rats, with empty stats for those without dogma", async () => {
    const groups = await loadData().readIncursionRats();
    expect(readNpcStats).toHaveBeenCalledWith([3484, 3485]);
    expect(groups.map((g) => [g.groupId, g.name])).toEqual([
      [1056, "Incursion Sansha's Nation Battleship"],
      [1054, "Group 1054"],
    ]);
    expect(groups[0]?.rats[0]?.stats).toEqual({ marker: "stats of 3484" });
    expect(groups[1]?.rats[0]?.stats.dps).toBeUndefined();
  });
});
