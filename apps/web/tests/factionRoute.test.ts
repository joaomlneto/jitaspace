/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type { FactionTables } from "~/app/faction/[factionId]/types";

// ---------------------------------------------------------------------------
// GET /api/faction/[factionId] serves the rows behind the faction page's tables,
// which the page itself ships without. Same reads as the page, CDN-cached.
// ---------------------------------------------------------------------------

type Query = (args?: unknown) => Promise<unknown>;

const prismaMock = {
  faction: { findUnique: jest.fn<Query>() },
  race: { findMany: jest.fn<Query>() },
  region: { findMany: jest.fn<Query>() },
  constellation: { findMany: jest.fn<Query>() },
  solarSystem: { findMany: jest.fn<Query>() },
  type: { findMany: jest.fn<Query>() },
  contrabandType: { findMany: jest.fn<Query>() },
  mission: { findMany: jest.fn<Query>() },
  epicArc: { findMany: jest.fn<Query>() },
  dungeon: { findMany: jest.fn<Query>() },
  skillPlan: { findMany: jest.fn<Query>() },
  stationStandingsRestriction: { findMany: jest.fn<Query>() },
  controlTowerResource: { findMany: jest.fn<Query>() },
  metaGroup: { findMany: jest.fn<Query>() },
  corporation: { findMany: jest.fn<Query>(), aggregate: jest.fn<Query>() },
  stationService: { findMany: jest.fn<Query>() },
  alliance: { findMany: jest.fn<Query>() },
  solarSystemSovereignty: { findMany: jest.fn<Query>() },
};

jest.mock("~/lib/db", () => ({ prisma: prismaMock }));

const CALDARI = 500001;

const factionRow = {
  factionId: CALDARI,
  name: "Caldari State",
  description: "desc",
  shortDescription: null,
  isUnique: true,
  sizeFactor: 5,
  stationCount: 10,
  stationSystemCount: 4,
  iconId: null,
  isDeleted: false,
  corporationId: 1000035,
  factionCorporation: { name: "Caldari Navy" },
  militiaCorporationId: null,
  militiaCorporation: null,
  solarSystem: null,
  memberRaces: [],
};

const systemRow = {
  solarSystemId: 1,
  name: "System 1",
  securityStatus: { toString: () => "0.5" },
  constellationId: 20000001,
  constellation: {
    name: "C",
    regionId: 10000002,
    region: { name: "The Forge" },
  },
  isHub: null,
  isBorder: null,
  isFringe: null,
  isCorridor: null,
  _count: { stations: 2 },
};

/** Every list read returns nothing except the faction's one solar system. */
function mockReads() {
  prismaMock.faction.findUnique.mockResolvedValue(factionRow);
  for (const [model, mock] of Object.entries(prismaMock)) {
    if ("findMany" in mock) {
      mock.findMany.mockResolvedValue(
        model === "solarSystem" ? [systemRow] : [],
      );
    }
  }
  prismaMock.corporation.aggregate.mockResolvedValue({
    _count: { corporationId: 0 },
    _sum: { memberCount: null },
  });
}

describe("GET /api/faction/[factionId]", () => {
  const get = (factionId: string) => {
    const { GET } = require("~/app/api/faction/[factionId]/route") as {
      GET: (
        request: Request,
        context: { params: Promise<{ factionId: string }> },
      ) => Promise<Response>;
    };
    return GET(new Request("http://localhost/api/faction/x"), {
      params: Promise.resolve({ factionId }),
    });
  };

  beforeEach(() => {
    for (const model of Object.values(prismaMock)) {
      for (const fn of Object.values(model)) fn.mockReset();
    }
  });

  it("rejects an id that is not one", async () => {
    expect((await get("abc")).status).toBe(400);
    expect(prismaMock.faction.findUnique).not.toHaveBeenCalled();
  });

  it("404s an unknown faction", async () => {
    prismaMock.faction.findUnique.mockResolvedValue(null);
    expect((await get("9")).status).toBe(404);
  });

  it("serves the table rows, cached at the CDN", async () => {
    mockReads();

    const response = await get(String(CALDARI));
    const body = (await response.json()) as FactionTables;

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=3600");
    expect(body.systems.map((system) => system.name)).toEqual(["System 1"]);
    expect(Object.keys(body).sort()).toEqual(
      [
        "contraband",
        "corporations",
        "dungeons",
        "enlistedCorporations",
        "items",
        "lostSystems",
        "missions",
        "sovereignty",
        "standingRestrictions",
        "systems",
      ].sort(),
    );
  });

  it("lets a database failure answer 500 rather than cache an error", async () => {
    prismaMock.faction.findUnique.mockRejectedValue(new Error("down"));
    await expect(get(String(CALDARI))).rejects.toThrow("down");
  });
});
