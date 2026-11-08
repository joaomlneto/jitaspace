/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type * as DbModule from "@jitaspace/db";

import type * as RouteModule from "../app/api/contracts/open/[shard]/route";
import type * as SnapshotModule from "../app/contracts/snapshot";
import type {
  OpenContractsShard,
  SnapshotContract,
} from "~/components/Contracts/snapshot";
import {
  decodeOpenContractsShard,
  ITEM_ASKED,
  ITEM_COPY,
  OPEN_CONTRACT_SHARDS,
} from "~/components/Contracts/snapshot";

// The open contracts snapshot: how a shard is read from the database, how
// the route serves it, and how the browser turns it back into contracts.

type Fn = ReturnType<typeof jest.fn<(...args: unknown[]) => Promise<unknown>>>;
const mockQueryRaw: Fn = jest.fn<(...args: unknown[]) => Promise<unknown>>();
jest.mock("~/lib/db", () => ({
  prisma: { $queryRaw: (...args: unknown[]) => mockQueryRaw(...args) },
  Prisma: jest.requireActual<typeof DbModule>("@jitaspace/db").Prisma,
}));

const { Prisma } = jest.requireActual<typeof DbModule>("@jitaspace/db");

const loadSnapshot = () =>
  require("../app/contracts/snapshot") as typeof SnapshotModule;
const loadGET = () =>
  (require("../app/api/contracts/open/[shard]/route") as typeof RouteModule)
    .GET;

/** Each raw query's SQL, with Postgres placeholders, and its values. */
const queries = () =>
  mockQueryRaw.mock.calls.map(([strings, ...values]) =>
    Prisma.sql(strings as readonly string[], ...(values as never[])),
  );

const NOW = Date.parse("2026-11-08T12:00:00Z");

/** A Contract row as the shard read selects it. */
const contractRow = (overrides: Record<string, unknown> = {}) => ({
  contractId: 16,
  type: "ItemExchange",
  title: "Cheap ships",
  issuerId: 90000001,
  issuerCorporationId: 98000001,
  forCorporation: false,
  dateIssued: new Date("2026-11-01T00:00:00Z"),
  dateExpired: new Date("2026-11-15T00:00:00Z"),
  daysToComplete: 0,
  volume: 2500,
  price: 1_000_000,
  reward: 0,
  collateral: 0,
  buyout: 0,
  regionId: 10000002,
  startLocationId: 60003760n,
  endLocationId: 60003760n,
  solarSystemId: 30000142,
  stationId: 60003760,
  lastSeenAt: new Date("2026-11-08T11:00:00Z"),
  ...overrides,
});

/**
 * Answers each raw query by what it selects from: the shard's contracts, then
 * items, bids, names and locations.
 */
function stubDatabase({
  contracts = [contractRow()],
  items = [] as unknown[],
  bids = [] as unknown[],
} = {}) {
  mockQueryRaw.mockImplementation((strings) => {
    const sql = (strings as readonly string[]).join("?");
    if (sql.includes(`FROM "ContractItem"`)) return Promise.resolve(items);
    if (sql.includes(`FROM "ContractBid"`)) return Promise.resolve(bids);
    if (sql.includes(`FROM "Character"`)) {
      return Promise.resolve([{ id: 90000001, name: "Issuer" }]);
    }
    if (sql.includes(`FROM "Corporation"`)) {
      return Promise.resolve([{ id: 98000001, name: "Corp" }]);
    }
    if (sql.includes(`FROM "Region"`)) {
      return Promise.resolve([{ id: 10000002, name: "The Forge" }]);
    }
    if (sql.includes(`FROM "Station"`)) {
      return Promise.resolve([
        {
          stationId: 60003760,
          name: "Jita IV - Moon 4",
          solarSystemId: 30000142,
        },
        { stationId: 60008494, name: "Amarr VIII", solarSystemId: 30002187 },
      ]);
    }
    if (sql.includes(`FROM "Type"`)) {
      return Promise.resolve([
        { typeId: 587, name: "Rifter", categoryId: 6 },
        { typeId: 691, name: "Rifter Blueprint", categoryId: 9 },
      ]);
    }
    if (sql.includes(`FROM "SolarSystem"`)) {
      return Promise.resolve([
        { solarSystemId: 30000142, name: "Jita", securityStatus: 0.9 },
        { solarSystemId: 30002187, name: "Amarr", securityStatus: 1 },
      ]);
    }
    return Promise.resolve(contracts);
  });
}

beforeEach(() => {
  mockQueryRaw.mockReset();
  jest.spyOn(Date, "now").mockReturnValue(NOW);
});

describe("readOpenContractsShard", () => {
  it("reads one shard of the open listed contracts, by contract id", async () => {
    stubDatabase();
    await loadSnapshot().readOpenContractsShard(3);

    const [contracts] = queries();
    expect(contracts?.text).toContain(`"isDeleted" = false`);
    expect(contracts?.text).toContain(
      `"type" IN ('ItemExchange', 'Auction', 'Courier')`,
    );
    expect(contracts?.text).toContain(`"contractId" % $1 = $2`);
    expect(contracts?.values).toEqual([OPEN_CONTRACT_SHARDS, 3]);
  });

  it("selects the shard again for its items and bids, not a bound id list", async () => {
    stubDatabase();
    await loadSnapshot().readOpenContractsShard(1);

    for (const table of ["ContractItem", "ContractBid"]) {
      const query = queries().find((q) => q.text.includes(`FROM "${table}"`));
      expect(query?.text).toMatch(
        /"contractId" = ANY\(ARRAY\(SELECT "contractId" FROM "Contract" WHERE/,
      );
      expect(query?.values).toEqual([OPEN_CONTRACT_SHARDS, 1]);
    }
  });

  it("looks names up once per distinct id, as one array", async () => {
    stubDatabase({
      contracts: [contractRow(), contractRow({ contractId: 24 })],
    });
    await loadSnapshot().readOpenContractsShard(0);

    const characters = queries().find((q) =>
      q.text.includes(`FROM "Character"`),
    );
    expect(characters?.text).toContain(`= ANY($1::int[])`);
    expect(characters?.values).toEqual([[90000001]]);
  });

  it("packs each contract into a tuple, with its names alongside", async () => {
    stubDatabase({
      contracts: [
        contractRow(),
        contractRow({
          contractId: 32,
          type: "Courier",
          title: "",
          forCorporation: true,
          price: 0,
          reward: 5_000_000,
          collateral: 100_000_000,
          daysToComplete: 3,
          endLocationId: 60008494n,
          lastSeenAt: new Date("2026-11-08T11:30:00Z"),
        }),
        contractRow({
          contractId: 40,
          type: "Auction",
          startLocationId: 1_035_466_617_946n,
          endLocationId: 1_035_466_617_946n,
          solarSystemId: null,
          stationId: null,
          lastSeenAt: null,
        }),
      ],
      items: [
        {
          contractId: 16,
          typeId: 587,
          quantity: 2,
          isIncluded: true,
          isBlueprintCopy: null,
        },
        {
          contractId: 40,
          typeId: 691,
          quantity: 1,
          isIncluded: true,
          isBlueprintCopy: true,
        },
        {
          contractId: 40,
          typeId: 34,
          quantity: 500,
          isIncluded: false,
          isBlueprintCopy: null,
        },
      ],
      bids: [{ contractId: 40, highest: 7_500_000, count: 3 }],
    });
    const shard = await loadSnapshot().readOpenContractsShard(0);

    expect(shard.contracts[0]).toEqual([
      16,
      0,
      "Cheap ships",
      90000001,
      98000001,
      0,
      1793491200,
      1794700800,
      0,
      2500,
      1_000_000,
      null,
      null,
      null,
      10000002,
      60003760,
      30000142,
      60003760,
      null,
      0,
      [587, 2, 0],
    ]);
    // ESI's 0 for an unused amount travels as null.
    expect(shard.contracts[1]?.slice(10, 14)).toEqual([
      null,
      5_000_000,
      100_000_000,
      null,
    ]);
    expect(shard.contracts[1]?.[5]).toBe(1);
    expect(shard.contracts[1]?.[1]).toBe(2);
    expect(shard.contracts[2]?.[1]).toBe(1);
    expect(shard.contracts[2]?.slice(18)).toEqual([
      7_500_000,
      3,
      [691, 1, ITEM_COPY, 34, 500, ITEM_ASKED],
    ]);

    expect(shard.characters).toEqual({ "90000001": "Issuer" });
    expect(shard.regions).toEqual({ "10000002": "The Forge" });
    expect(shard.types).toEqual({
      "587": ["Rifter", 0],
      "691": ["Rifter Blueprint", 1],
    });
    expect(shard.stations["60008494"]).toEqual(["Amarr VIII", 30002187]);
    expect(shard.systems["30002187"]).toEqual(["Amarr", 1]);
    expect(shard.snapshotAt).toBe("2026-11-08T11:30:00.000Z");
    expect(shard.isBackfilling).toBe(false);

    // Only NPC stations are looked up: the courier's end, and the starts.
    const stations = queries().find((q) => q.text.includes(`FROM "Station"`));
    expect(stations?.values).toEqual([[60003760, 60008494]]);
  });

  it("flags a listing over two days old as a backfill", async () => {
    stubDatabase({
      contracts: [
        contractRow({ lastSeenAt: new Date(NOW - 3 * 24 * 60 * 60 * 1000) }),
      ],
    });
    expect((await loadSnapshot().readOpenContractsShard(0)).isBackfilling).toBe(
      true,
    );
  });

  it("is empty, not backfilling, for a shard with nothing open", async () => {
    stubDatabase({ contracts: [] });
    const shard = await loadSnapshot().readOpenContractsShard(5);
    expect(shard).toMatchObject({
      shard: 5,
      contracts: [],
      snapshotAt: null,
      isBackfilling: false,
    });
  });
});

describe("GET /api/contracts/open/[shard]", () => {
  const get = (shard: string) =>
    loadGET()(
      new Request(`https://www.jita.space/api/contracts/open/${shard}`),
      {
        params: Promise.resolve({ shard }),
      },
    );

  it("serves a shard, cached at the CDN for a sync", async () => {
    stubDatabase();
    const response = await get("2");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=300, s-maxage=1800, stale-while-revalidate=86400",
    );
    const body = (await response.json()) as OpenContractsShard;
    expect(body.shard).toBe(2);
    expect(body.contracts).toHaveLength(1);
  });

  it.each(["8", "-1", "1.5", "abc", "01x"])(
    "404s shard %s without a query",
    async (shard) => {
      const response = await get(shard);
      expect(response.status).toBe(404);
      expect(mockQueryRaw).not.toHaveBeenCalled();
    },
  );

  it("warns when a shard grows towards the response limit", async () => {
    const warn = jest
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    stubDatabase({
      contracts: Array.from({ length: 2 }, (_, index) =>
        contractRow({ contractId: index * 8, title: "x".repeat(1_800_000) }),
      ),
    });
    await get("0");
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("raise OPEN_CONTRACT_SHARDS"),
    );
    warn.mockRestore();
  });

  it("lets a database failure throw, so nothing is cached", async () => {
    mockQueryRaw.mockRejectedValue(new Error("db down"));
    await expect(get("0")).rejects.toThrow("db down");
  });
});

describe("decodeOpenContractsShard", () => {
  const tuple = (
    overrides: Partial<Record<number, unknown>> = {},
  ): SnapshotContract => {
    const base: SnapshotContract = [
      16,
      0,
      "Cheap ships",
      90000001,
      98000001,
      0,
      1793491200,
      1794700800,
      null,
      2500,
      1_000_000,
      null,
      null,
      null,
      10000002,
      60003760,
      30000142,
      60003760,
      null,
      0,
      [587, 2, 0],
    ];
    for (const [index, value] of Object.entries(overrides)) {
      (base as unknown[])[Number(index)] = value;
    }
    return base;
  };
  const shard = (contracts: SnapshotContract[]): OpenContractsShard => ({
    shard: 0,
    snapshotAt: null,
    isBackfilling: false,
    contracts,
    characters: { "90000001": "Issuer" },
    corporations: { "98000001": "Corp" },
    regions: { "10000002": "The Forge" },
    types: {
      "587": ["Rifter", 0],
      "691": ["Rifter Blueprint", 1],
      "34": ["Tritanium", 0],
    },
    systems: { "30000142": ["Jita", 0.9], "30002187": ["Amarr", 1] },
    stations: {
      "60003760": ["Jita IV - Moon 4", 30000142],
      "60008494": ["Amarr VIII", 30002187],
    },
  });

  it("restores the summary every view renders", () => {
    const [open] = decodeOpenContractsShard(shard([tuple()]));
    expect(open?.contract).toEqual({
      contractId: 16,
      type: "item_exchange",
      title: "Cheap ships",
      issuerId: 90000001,
      issuerName: "Issuer",
      issuerCorporationId: 98000001,
      issuerCorporationName: "Corp",
      forCorporation: false,
      dateIssued: "2026-11-01T00:00:00.000Z",
      dateExpired: "2026-11-15T00:00:00.000Z",
      daysToComplete: null,
      volume: 2500,
      price: 1_000_000,
      reward: null,
      collateral: null,
      buyout: null,
      start: {
        locationId: 60003760,
        kind: "station",
        name: "Jita IV - Moon 4",
        solarSystemId: 30000142,
        solarSystemName: "Jita",
        securityStatus: 0.9,
      },
      end: open?.contract.start,
      regionId: 10000002,
      regionName: "The Forge",
      items: {
        count: 1,
        first: {
          typeId: 587,
          name: "Rifter",
          quantity: 2,
          imageVariation: undefined,
        },
      },
      bidCount: 0,
      highestBid: null,
      isOpen: true,
    });
    // Delivered where it starts: the same location, not a copy.
    expect(open?.contract.end).toBe(open?.contract.start);
    expect(open?.search).toBe("cheap ships\nrifter");
    expect(open?.typeIds).toEqual([587]);
  });

  it("names a courier's end station and leaves a structure unnamed", () => {
    const [courier, structure] = decodeOpenContractsShard(
      shard([
        tuple({ 1: 2, 17: 60008494, 20: [] }),
        tuple({
          0: 24,
          15: 1_035_466_617_946,
          16: null,
          17: 1_040_000_000_000,
        }),
      ]),
    );
    expect(courier?.contract.type).toBe("courier");
    expect(courier?.contract.end).toEqual({
      locationId: 60008494,
      kind: "station",
      name: "Amarr VIII",
      solarSystemId: 30002187,
      solarSystemName: "Amarr",
      securityStatus: 1,
    });
    expect(courier?.contract.items).toEqual({ count: 0, first: null });
    expect(structure?.contract.start).toEqual({
      locationId: 1_035_466_617_946,
      kind: "structure",
      name: null,
      solarSystemId: null,
      solarSystemName: null,
      securityStatus: null,
    });
    expect(structure?.contract.end).toEqual({
      locationId: 1_040_000_000_000,
      kind: "structure",
    });
  });

  it("names a contract by its first offered item, a copy's image included", () => {
    const [open] = decodeOpenContractsShard(
      shard([
        tuple({
          1: 1,
          18: 7_500_000,
          19: 3,
          20: [34, 500, ITEM_ASKED, 691, 1, ITEM_COPY, 587, 1, 0, 999, 1, 0],
        }),
      ]),
    );
    expect(open?.contract.type).toBe("auction");
    // Asked-for items are searchable, but neither name nor count the offer.
    expect(open?.contract.items).toEqual({
      count: 3,
      first: {
        typeId: 691,
        name: "Rifter Blueprint",
        quantity: 1,
        imageVariation: "bpc",
      },
    });
    expect(open?.typeIds).toEqual([34, 691, 587, 999]);
    expect(open?.search).toBe(
      "cheap ships\ntritanium\nrifter blueprint\nrifter",
    );
    expect(open?.contract).toMatchObject({
      highestBid: 7_500_000,
      bidCount: 3,
    });
  });

  it("reads a kind it does not know, and missing names, as absent", () => {
    const [open] = decodeOpenContractsShard({
      ...shard([tuple({ 1: 9, 3: 1, 4: 2, 14: 3, 16: 1 })]),
    });
    expect(open?.contract).toMatchObject({
      type: "unknown",
      issuerName: null,
      issuerCorporationName: null,
      regionName: null,
    });
    expect(open?.contract.start?.solarSystemName).toBeNull();
  });
});
