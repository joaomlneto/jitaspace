/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type * as DbModule from "@jitaspace/db";

import type * as RouteModule from "../app/api/contracts/route";
import type * as DetailModule from "../app/contracts/[contractId]/data";
import type * as DataModule from "../app/contracts/data";
import type { ContractFilters } from "~/components/Contracts/filters";

// The contracts reads, against a stubbed Prisma client. The SQL helpers are
// the real ones, so a test can read the query the list page would send.

jest.mock("next/cache", () => ({ cacheLife: () => undefined }));

type Fn = ReturnType<typeof jest.fn<(...args: unknown[]) => Promise<unknown>>>;
const fn = (): Fn => jest.fn<(...args: unknown[]) => Promise<unknown>>();

const mockPrisma = {
  $queryRaw: fn(),
  contract: {
    findMany: fn(),
    findUnique: fn(),
    groupBy: fn(),
    aggregate: fn(),
  },
  contractItem: { findMany: fn(), groupBy: fn() },
  contractBid: { findMany: fn(), groupBy: fn() },
  contractDynamicItem: { findMany: fn() },
  station: { findMany: fn() },
  region: { findMany: fn() },
};
jest.mock("~/lib/db", () => ({
  prisma: mockPrisma,
  Prisma: jest.requireActual<typeof DbModule>("@jitaspace/db").Prisma,
}));

const { Prisma } = jest.requireActual<typeof DbModule>("@jitaspace/db");

const loadData = () => require("../app/contracts/data") as typeof DataModule;
const loadDetail = () =>
  require("../app/contracts/[contractId]/data") as typeof DetailModule;
const loadGET = () =>
  (require("../app/api/contracts/route") as typeof RouteModule).GET;

const FILTERS: ContractFilters = {
  type: "all",
  regionId: null,
  q: "",
  minPrice: null,
  maxPrice: null,
  sort: "newest",
  page: 1,
};

/** A Contract row as `contractSummarySelect` reads it. */
const contractRow = (overrides: Record<string, unknown> = {}) => ({
  contractId: 101,
  type: "ItemExchange",
  title: "Cheap ships",
  issuerId: 90000001,
  issuer: { name: "Issuer" },
  issuerCorporationId: 98000001,
  issuerCorporation: { name: "Corp" },
  forCorporation: false,
  dateIssued: new Date("2026-11-01T00:00:00Z"),
  dateExpired: new Date("2026-11-15T00:00:00Z"),
  daysToComplete: 0,
  volume: 2500,
  price: 1_000_000,
  reward: 0,
  collateral: 0,
  buyout: 0,
  startLocationId: 60003760n,
  endLocationId: 60003760n,
  regionId: 10000002,
  region: { name: "The Forge" },
  solarSystem: { solarSystemId: 30000142, name: "Jita", securityStatus: 0.9 },
  station: { name: "Jita IV - Moon 4" },
  lastSeenAt: new Date("2026-11-03T10:00:00Z"),
  isDeleted: false,
  items: [
    {
      typeId: 587,
      quantity: 1,
      isBlueprintCopy: null,
      type: { name: "Rifter", group: { categoryId: 6 } },
    },
  ],
  bids: [],
  ...overrides,
});

/**
 * The SQL of every `$queryRaw` call, rebuilt from the tagged template's parts:
 * `.text` with Postgres placeholders, `.values` in order.
 */
const rawQueries = () =>
  mockPrisma.$queryRaw.mock.calls.map(([strings, ...values]) =>
    Prisma.sql(strings as readonly string[], ...(values as never[])),
  );

/** Stubs one page read: the page's ids, the total, and the rows by id. */
function stubPage(
  ids: number[],
  total: number,
  rows = ids.map((contractId) => contractRow({ contractId })),
) {
  mockPrisma.$queryRaw.mockImplementation((strings) =>
    Promise.resolve(
      (strings as readonly string[]).join("").includes("count(*)")
        ? [{ total }]
        : ids.map((contractId) => ({ contractId })),
    ),
  );
  mockPrisma.contract.findMany.mockResolvedValue(rows);
  mockPrisma.contractItem.groupBy.mockResolvedValue([]);
  mockPrisma.contractBid.groupBy.mockResolvedValue([]);
  mockPrisma.station.findMany.mockResolvedValue([]);
}

beforeEach(() => {
  for (const model of Object.values(mockPrisma)) {
    if (typeof model === "function") model.mockReset();
    else for (const method of Object.values(model)) method.mockReset();
  }
});

describe("readPublicContracts", () => {
  it("lists open contracts of the three listed types, newest first", async () => {
    stubPage([], 0);
    await loadData().readPublicContracts(FILTERS);

    const [page, count] = rawQueries();
    expect(page?.text).toContain(`c."isDeleted" = false`);
    expect(page?.text).toContain(`c."type" IN (CAST($1 AS "ContractType")`);
    expect(page?.values.slice(0, 3)).toEqual([
      "ItemExchange",
      "Auction",
      "Courier",
    ]);
    expect(page?.text).toContain(
      `ORDER BY c."dateIssued" DESC, c."contractId" DESC`,
    );
    // Page 1: 48 rows from the start.
    expect(page?.values.slice(-2)).toEqual([48, 0]);
    expect(count?.text).toMatch(/^\s*SELECT count\(\*\)::int AS total/);
  });

  it("narrows by type, region, title and the headline ISK", async () => {
    stubPage([], 0);
    await loadData().readPublicContracts({
      ...FILTERS,
      type: "courier",
      regionId: 10000043,
      q: "50%_off\\",
      minPrice: 1000,
      maxPrice: 5000,
      page: 3,
    });

    const [page] = rawQueries();
    expect(page?.values).toEqual([
      "Courier",
      10000043,
      // LIKE wildcards in the search mean themselves.
      "%50\\%\\_off\\\\%",
      1000,
      5000,
      48,
      96,
    ]);
    expect(page?.text).toContain(`c."regionId" = $2`);
    expect(page?.text).toContain(`c."title" ILIKE $3`);
    // The price bounds compare the amount a card shows, not the raw price.
    expect(page?.text).toMatch(/NULLIF\(c\."reward", 0\)\s*\) >= \$4/);
    expect(page?.text).toMatch(/\) <= \$5/);
  });

  it.each([
    ["oldest", `c."dateIssued" ASC, c."contractId" ASC`],
    ["expiring", `c."dateExpired" ASC, c."contractId" ASC`],
    ["price-desc", `) DESC NULLS LAST, c."contractId" ASC`],
    ["price-asc", `) ASC NULLS LAST, c."contractId" ASC`],
  ] as const)("orders %s as %s", async (sort, order) => {
    stubPage([], 0);
    await loadData().readPublicContracts({ ...FILTERS, sort });
    expect(rawQueries()[0]?.text).toContain(order);
  });

  it("keeps the SQL's order and drops ids whose row vanished", async () => {
    stubPage([3, 1, 2], 3, [
      contractRow({ contractId: 1 }),
      contractRow({ contractId: 3 }),
    ]);
    const result = await loadData().readPublicContracts({
      ...FILTERS,
      page: 2,
    });

    expect(result.contracts.map((c) => c.contractId)).toEqual([3, 1]);
    expect(result).toMatchObject({ total: 3, page: 2, pageSize: 48 });
    expect(mockPrisma.contract.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { contractId: { in: [3, 1, 2] } } }),
    );
  });

  it("counts only the page's offered items and bids", async () => {
    stubPage([1], 1, [contractRow({ contractId: 1 })]);
    mockPrisma.contractItem.groupBy.mockResolvedValue([
      { contractId: 1, _count: { _all: 4 } },
    ]);
    mockPrisma.contractBid.groupBy.mockResolvedValue([
      { contractId: 1, _count: { _all: 2 } },
    ]);
    const {
      contracts: [summary],
    } = await loadData().readPublicContracts(FILTERS);

    expect(mockPrisma.contractItem.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { contractId: { in: [1] }, isIncluded: true },
      }),
    );
    expect(summary?.items?.count).toBe(4);
    expect(summary?.bidCount).toBe(2);
  });
});

describe("toContractSummary", () => {
  const NO_EXTRAS = {
    endStations: new Map(),
    itemCounts: new Map(),
    bidCounts: new Map(),
  };

  it("maps a row to what the cards show", () => {
    const summary = loadData().toContractSummary(
      contractRow() as never,
      NO_EXTRAS,
    );
    expect(summary).toMatchObject({
      contractId: 101,
      type: "item_exchange",
      issuerName: "Issuer",
      issuerCorporationName: "Corp",
      dateIssued: "2026-11-01T00:00:00.000Z",
      price: 1_000_000,
      // ESI's 0 for an amount a contract does not use reads as absent.
      reward: null,
      collateral: null,
      buyout: null,
      regionName: "The Forge",
      items: {
        count: 0,
        first: { typeId: 587, name: "Rifter", quantity: 1 },
      },
      bidCount: 0,
      highestBid: null,
      lastSeenAt: "2026-11-03T10:00:00.000Z",
      isOpen: true,
    });
    expect(summary.start).toEqual({
      locationId: 60003760,
      kind: "station",
      name: "Jita IV - Moon 4",
      solarSystemId: 30000142,
      solarSystemName: "Jita",
      securityStatus: 0.9,
    });
    // Delivered where it starts: the same location, not a second lookup.
    expect(summary.end).toBe(summary.start);
    expect(summary.items?.first?.imageVariation).toBeUndefined();
  });

  it("names a courier's end station from the page's lookup", () => {
    const summary = loadData().toContractSummary(
      contractRow({
        type: "Courier",
        endLocationId: 60008494n,
        items: [],
        bids: [],
        solarSystem: null,
        lastSeenAt: null,
        isDeleted: true,
      }) as never,
      {
        ...NO_EXTRAS,
        endStations: new Map([
          [
            60008494,
            {
              name: "Amarr VIII",
              solarSystemId: 30002187,
              solarSystemName: "Amarr",
              securityStatus: 1,
            },
          ],
        ]),
      },
    );
    expect(summary.type).toBe("courier");
    expect(summary.start?.securityStatus).toBeNull();
    expect(summary.end).toEqual({
      locationId: 60008494,
      kind: "station",
      name: "Amarr VIII",
      solarSystemId: 30002187,
      solarSystemName: "Amarr",
      securityStatus: 1,
    });
    expect(summary.items?.first).toBeNull();
    expect(summary.lastSeenAt).toBeNull();
    expect(summary.isOpen).toBe(false);
  });

  it("shows a blueprint copy's image and an auction's top bid", () => {
    const summary = loadData().toContractSummary(
      contractRow({
        type: "Auction",
        startLocationId: null,
        endLocationId: null,
        items: [
          {
            typeId: 691,
            quantity: 1,
            isBlueprintCopy: true,
            type: { name: "Rifter Blueprint", group: { categoryId: 9 } },
          },
        ],
        bids: [{ amount: 7_500_000 }],
      }) as never,
      NO_EXTRAS,
    );
    expect(summary.type).toBe("auction");
    expect(summary.start).toBeNull();
    expect(summary.end).toBeNull();
    expect(summary.items?.first?.imageVariation).toBe("bpc");
    expect(summary.highestBid).toBe(7_500_000);
  });

  it("reads a type it does not list as unknown", () => {
    expect(
      loadData().toContractSummary(
        contractRow({ type: "Loan" }) as never,
        NO_EXTRAS,
      ).type,
    ).toBe("loan");
    expect(
      loadData().toContractSummary(
        contractRow({ type: "Whatever" }) as never,
        NO_EXTRAS,
      ).type,
    ).toBe("unknown");
  });
});

describe("readEndStations", () => {
  it("looks up only distinct NPC stations other than the start", async () => {
    mockPrisma.station.findMany.mockResolvedValue([
      {
        stationId: 60008494,
        name: "Amarr VIII",
        solarSystem: null,
      },
    ]);
    const stations = await loadData().readEndStations([
      { startLocationId: 60003760n, endLocationId: 60008494n },
      { startLocationId: 60003760n, endLocationId: 60008494n },
      // Same as the start, a structure, and none: nothing to look up.
      { startLocationId: 60003760n, endLocationId: 60003760n },
      { startLocationId: 60003760n, endLocationId: 1_035_466_617_946n },
      { startLocationId: 60003760n, endLocationId: null },
    ]);

    expect(mockPrisma.station.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { stationId: { in: [60008494] } } }),
    );
    expect(stations.get(60008494)).toEqual({
      name: "Amarr VIII",
      solarSystemId: null,
      solarSystemName: null,
      securityStatus: null,
    });
  });

  it("does not query when no row ends at another station", async () => {
    const stations = await loadData().readEndStations([
      { startLocationId: 60003760n, endLocationId: 60003760n },
    ]);
    expect(stations.size).toBe(0);
    expect(mockPrisma.station.findMany).not.toHaveBeenCalled();
  });
});

describe("readOpenContractsOverview", () => {
  const NOW = Date.parse("2026-11-04T12:00:00Z");

  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(NOW);
    mockPrisma.contract.groupBy.mockResolvedValue([
      { regionId: 10000043, _count: { _all: 5 } },
      { regionId: 10000002, _count: { _all: 20 } },
      { regionId: 10000032, _count: { _all: 5 } },
      { regionId: 10000099, _count: { _all: 1 } },
    ]);
    mockPrisma.region.findMany.mockResolvedValue([
      { regionId: 10000002, name: "The Forge" },
      { regionId: 10000043, name: "Domain" },
      { regionId: 10000032, name: "Sinq Laison" },
    ]);
  });

  it("lists regions busiest first, then by name", async () => {
    mockPrisma.contract.aggregate.mockResolvedValue({
      _max: { lastSeenAt: new Date(NOW - 60 * 60 * 1000) },
    });
    const overview = await loadData().readOpenContractsOverview();

    expect(overview.regions).toEqual([
      { regionId: 10000002, name: "The Forge", count: 20 },
      { regionId: 10000043, name: "Domain", count: 5 },
      { regionId: 10000032, name: "Sinq Laison", count: 5 },
      // A region with no row is still listed, by id.
      { regionId: 10000099, name: "Region 10000099", count: 1 },
    ]);
    expect(overview.total).toBe(31);
    expect(overview.snapshotAt).toBe("2026-11-04T11:00:00.000Z");
    expect(overview.isBackfilling).toBe(false);
  });

  it("flags a snapshot over two days old as a backfill", async () => {
    mockPrisma.contract.aggregate.mockResolvedValue({
      _max: { lastSeenAt: new Date(NOW - 3 * 24 * 60 * 60 * 1000) },
    });
    expect((await loadData().readOpenContractsOverview()).isBackfilling).toBe(
      true,
    );
  });

  it("reports no snapshot when nothing is open", async () => {
    mockPrisma.contract.aggregate.mockResolvedValue({
      _max: { lastSeenAt: null },
    });
    const overview = await loadData().readOpenContractsOverview();
    expect(overview.snapshotAt).toBeNull();
    expect(overview.isBackfilling).toBe(false);
  });

  it("throws a database failure rather than caching an empty browser", async () => {
    mockPrisma.contract.aggregate.mockRejectedValue(new Error("db down"));
    await expect(loadData().readOpenContractsOverview()).rejects.toThrow(
      "db down",
    );
  });
});

describe("readContractDetail", () => {
  it("is null for a contract no snapshot listed", async () => {
    mockPrisma.contract.findUnique.mockResolvedValue(null);
    expect(await loadDetail().readContractDetail(5)).toBeNull();
    expect(mockPrisma.contractItem.findMany).not.toHaveBeenCalled();
  });

  it("returns the items, mutations and bids the snapshots recorded", async () => {
    mockPrisma.contract.findUnique.mockResolvedValue(
      contractRow({
        type: "Auction",
        firstSeenAt: new Date("2026-10-30T00:00:00Z"),
        endReason: "Expired",
      }),
    );
    mockPrisma.contractItem.findMany.mockResolvedValue([
      {
        recordId: 11n,
        typeId: 47740,
        type: { name: "Abyssal Damage Control", group: { categoryId: 7 } },
        quantity: 1,
        isIncluded: true,
        itemId: 1_000_000_000_001n,
        isBlueprintCopy: null,
        materialEfficiency: null,
        timeEfficiency: null,
        runs: null,
      },
      {
        recordId: 12n,
        typeId: 691,
        type: { name: "Rifter Blueprint", group: { categoryId: 9 } },
        quantity: 1,
        isIncluded: true,
        itemId: null,
        isBlueprintCopy: false,
        materialEfficiency: 10,
        timeEfficiency: 20,
        runs: -1,
      },
      {
        recordId: 13n,
        typeId: 34,
        type: { name: "Tritanium", group: { categoryId: 4 } },
        quantity: 1000,
        isIncluded: false,
        itemId: 2n,
        isBlueprintCopy: null,
        materialEfficiency: null,
        timeEfficiency: null,
        runs: null,
      },
    ]);
    mockPrisma.contractBid.findMany.mockResolvedValue([
      { bidId: 2, amount: 9e6, dateBid: new Date("2026-11-02T00:00:00Z") },
      { bidId: 1, amount: 8e6, dateBid: new Date("2026-11-01T00:00:00Z") },
    ]);
    mockPrisma.contractDynamicItem.findMany.mockResolvedValue([
      {
        item: {
          itemId: 1_000_000_000_001n,
          sourceTypeId: 2048,
          mutatorTypeId: 52230,
          mutatorType: { name: "Unstable Damage Control Mutaplasmid" },
        },
      },
    ]);
    mockPrisma.station.findMany.mockResolvedValue([]);

    const detail = await loadDetail().readContractDetail(101);

    expect(detail?.contract.type).toBe("auction");
    // Offered items only; the one asked of the acceptor is not counted.
    expect(detail?.contract.items?.count).toBe(2);
    expect(detail?.contract.bidCount).toBe(2);
    expect(detail?.items.map((item) => item.recordId)).toEqual([
      "11",
      "12",
      "13",
    ]);
    expect(detail?.items[0]?.mutation).toEqual({
      itemId: "1000000000001",
      sourceTypeId: 2048,
      mutatorTypeId: 52230,
      mutatorName: "Unstable Damage Control Mutaplasmid",
    });
    expect(detail?.items[1]).toMatchObject({
      imageVariation: "bp",
      materialEfficiency: 10,
      mutation: null,
    });
    // An item id with no dynamic row is not a mutated item.
    expect(detail?.items[2]?.mutation).toBeNull();
    expect(detail?.bids).toEqual([
      { bidId: 2, amount: 9e6, dateBid: "2026-11-02T00:00:00.000Z" },
      { bidId: 1, amount: 8e6, dateBid: "2026-11-01T00:00:00.000Z" },
    ]);
    expect(detail?.firstSeenAt).toBe("2026-10-30T00:00:00.000Z");
    expect(detail?.endReason).toBe("Expired");
  });
});

describe("GET /api/contracts", () => {
  it("serves the page the query string asks for, cached at the CDN", async () => {
    stubPage([1], 1, [contractRow({ contractId: 1 })]);
    const response = await loadGET()(
      new Request("https://www.jita.space/api/contracts?type=auction&page=2"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    );
    const body = (await response.json()) as DataModule.PublicContractsPage;
    expect(body).toMatchObject({ total: 1, page: 2, pageSize: 48 });
    expect(body.contracts[0]?.contractId).toBe(1);
    const [page] = rawQueries();
    expect(page?.values[0]).toBe("Auction");
    expect(page?.values.slice(-1)).toEqual([48]);
  });

  it("lets a database failure throw, so nothing is cached", async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error("db down"));
    await expect(
      loadGET()(new Request("https://www.jita.space/api/contracts")),
    ).rejects.toThrow("db down");
  });
});
