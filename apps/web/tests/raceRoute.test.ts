/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type {
  RaceCloneSkillRow,
  RaceCorporationRow,
  RaceItemRow,
  RaceSkillRow,
  RaceStationRow,
} from "~/app/race/[raceId]/types";

// ---------------------------------------------------------------------------
// GET /api/race/[raceId]/[table] serves one of the long lists behind the race
// page's tabs (items, NPC corporations, stations), which the page itself ships
// without. CDN-cached.
// ---------------------------------------------------------------------------

type Query = (args?: unknown) => Promise<unknown>;

const prismaMock = {
  race: { findUnique: jest.fn<Query>() },
  type: { findMany: jest.fn<Query>() },
  metaGroup: { findMany: jest.fn<Query>() },
  corporation: { findMany: jest.fn<Query>() },
  station: { findMany: jest.fn<Query>() },
  cloneGrade: { findUnique: jest.fn<Query>() },
  typeAttribute: { findMany: jest.fn<Query>() },
};

jest.mock("~/lib/db", () => ({ prisma: prismaMock }));

const AMARR = 4;

const raceRow = {
  name: "Amarr",
  description: "The Amarr Empire.",
  shipTypeId: 596,
  isDeleted: false,
  faction: { name: "Amarr Empire" },
  _count: { bloodlines: 3 },
};

const location = {
  solarSystemId: 30002187,
  name: "Amarr",
  securityStatus: { toString: () => "1" },
  constellation: { regionId: 10000043, region: { name: "Domain" } },
};

describe("GET /api/race/[raceId]/[table]", () => {
  const get = (raceId: string, table: string) => {
    const { GET } = require("~/app/api/race/[raceId]/[table]/route") as {
      GET: (
        request: Request,
        context: { params: Promise<{ raceId: string; table: string }> },
      ) => Promise<Response>;
    };
    return GET(new Request("http://localhost/api/race/x/y"), {
      params: Promise.resolve({ raceId, table }),
    });
  };

  beforeEach(() => {
    for (const model of Object.values(prismaMock)) {
      for (const fn of Object.values(model)) fn.mockReset();
    }
  });

  it("rejects an id that is not one", async () => {
    expect((await get("abc", "items")).status).toBe(400);
    expect(prismaMock.race.findUnique).not.toHaveBeenCalled();
  });

  it("404s a table it does not serve, without querying", async () => {
    expect((await get(String(AMARR), "bloodlines")).status).toBe(404);
    expect(prismaMock.race.findUnique).not.toHaveBeenCalled();
  });

  it("404s an unknown race", async () => {
    prismaMock.race.findUnique.mockResolvedValue(null);
    expect((await get("999", "items")).status).toBe(404);
    expect(prismaMock.type.findMany).not.toHaveBeenCalled();
  });

  it("404s a race the ingest soft-deleted", async () => {
    prismaMock.race.findUnique.mockResolvedValue({
      ...raceRow,
      isDeleted: true,
    });
    expect((await get(String(AMARR), "items")).status).toBe(404);
  });

  it("serves the items, cached at the CDN", async () => {
    prismaMock.race.findUnique.mockResolvedValue(raceRow);
    prismaMock.type.findMany.mockResolvedValue([
      {
        typeId: 642,
        name: "Apocalypse",
        published: true,
        groupId: 27,
        metaGroupId: 1,
        techLevel: 1,
        mass: 97_100_000,
        group: {
          name: "Battleship",
          categoryId: 6,
          category: { name: "Ship" },
        },
      },
    ]);
    prismaMock.metaGroup.findMany.mockResolvedValue([
      { metaGroupId: 1, name: "Tech I" },
    ]);

    const response = await get(String(AMARR), "items");
    const body = (await response.json()) as RaceItemRow[];

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=3600");
    // The rows the table shows, without the mass the page sorts classes by.
    expect(body).toEqual([
      {
        typeId: 642,
        name: "Apocalypse",
        published: true,
        groupId: 27,
        groupName: "Battleship",
        categoryId: 6,
        categoryName: "Ship",
        metaGroupName: "Tech I",
        techLevel: 1,
      },
    ]);
  });

  it("serves the corporations", async () => {
    prismaMock.race.findUnique.mockResolvedValue(raceRow);
    prismaMock.corporation.findMany.mockResolvedValue([
      {
        corporationId: 1000066,
        name: "Viziam",
        ticker: "VIZ",
        memberCount: 12,
        raceId: AMARR,
        factionId: 500003,
        faction: { name: "Amarr Empire" },
        size: "L",
        extent: "R",
        allowedRaces: [{ raceId: AMARR }],
        _count: { ownedStations: 40, LoyaltyStoreOffer: 200 },
      },
    ]);

    const body = (await (
      await get(String(AMARR), "corporations")
    ).json()) as RaceCorporationRow[];

    expect(body).toEqual([
      expect.objectContaining({
        name: "Viziam",
        isRaceCorporation: true,
        acceptsRace: true,
        stations: 40,
        lpOffers: 200,
      }),
    ]);
  });

  it("serves the stations, with where they are and who owns them", async () => {
    prismaMock.race.findUnique.mockResolvedValue(raceRow);
    prismaMock.station.findMany.mockResolvedValue([
      {
        stationId: 60008494,
        name: "Amarr VIII (Oris) - Emperor Family Academy",
        typeId: 1932,
        stationType: { name: "Amarr Trade Post" },
        ownerId: 1000086,
        owner: { name: "Emperor Family" },
        solarSystem: location,
      },
    ]);

    const body = (await (
      await get(String(AMARR), "stations")
    ).json()) as RaceStationRow[];

    expect(body).toEqual([
      {
        stationId: 60008494,
        stationName: "Amarr VIII (Oris) - Emperor Family Academy",
        typeId: 1932,
        typeName: "Amarr Trade Post",
        ownerId: 1000086,
        ownerName: "Emperor Family",
        solarSystemId: 30002187,
        name: "Amarr",
        securityStatus: 1,
        regionId: 10000043,
        regionName: "Domain",
      },
    ]);
  });

  it("serves the Alpha clone skills and the racial skills", async () => {
    prismaMock.race.findUnique.mockResolvedValue(raceRow);
    // The race's types (by raceId), then the skills' names (by id).
    prismaMock.type.findMany.mockImplementation((args) =>
      Promise.resolve(
        (args as { where: { raceId?: number } }).where.raceId === undefined
          ? [
              {
                typeId: 3303,
                name: "Small Energy Turret",
                published: true,
                groupId: 255,
                group: { name: "Gunnery" },
              },
              {
                typeId: 3343,
                name: "Amarr Battleship",
                published: true,
                groupId: 257,
                group: { name: "Spaceship Command" },
              },
            ]
          : [
              {
                typeId: 3343,
                name: "Amarr Battleship",
                published: true,
                groupId: 257,
                metaGroupId: null,
                techLevel: null,
                mass: null,
                group: {
                  name: "Spaceship Command",
                  categoryId: 16,
                  category: { name: "Skill" },
                },
              },
            ],
      ),
    );
    prismaMock.metaGroup.findMany.mockResolvedValue([]);
    prismaMock.cloneGrade.findUnique.mockResolvedValue({
      isDeleted: false,
      skills: [{ skillTypeId: 3303, level: 4 }],
    });
    prismaMock.typeAttribute.findMany.mockResolvedValue([
      { typeId: 3303, attributeId: 275, value: 1 },
      { typeId: 3343, attributeId: 275, value: 8 },
    ]);

    const alpha = (await (
      await get(String(AMARR), "alphaSkills")
    ).json()) as RaceCloneSkillRow[];
    const racial = (await (
      await get(String(AMARR), "racialSkills")
    ).json()) as RaceSkillRow[];

    expect(alpha).toEqual([
      expect.objectContaining({
        name: "Small Energy Turret",
        maxLevel: 4,
        rank: 1,
      }),
    ]);
    expect(racial).toEqual([
      expect.objectContaining({ name: "Amarr Battleship", rank: 8 }),
    ]);
  });

  it("lets a database failure answer 500 rather than cache an error", async () => {
    prismaMock.race.findUnique.mockRejectedValue(new Error("down"));
    await expect(get(String(AMARR), "items")).rejects.toThrow("down");
  });
});
