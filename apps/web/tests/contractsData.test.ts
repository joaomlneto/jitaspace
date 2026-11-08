/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type * as DetailModule from "../app/contracts/[contractId]/data";
import type * as DataModule from "../app/contracts/data";

// The contract page's reads, against a stubbed Prisma client.

jest.mock("next/cache", () => ({ cacheLife: () => undefined }));

type Fn = ReturnType<typeof jest.fn<(...args: unknown[]) => Promise<unknown>>>;
const fn = (): Fn => jest.fn<(...args: unknown[]) => Promise<unknown>>();

const mockPrisma = {
  contract: { findUnique: fn() },
  contractItem: { findMany: fn() },
  contractBid: { findMany: fn() },
  contractDynamicItem: { findMany: fn() },
  station: { findMany: fn() },
};
jest.mock("~/lib/db", () => ({ prisma: mockPrisma }));

const loadData = () => require("../app/contracts/data") as typeof DataModule;
const loadDetail = () =>
  require("../app/contracts/[contractId]/data") as typeof DetailModule;

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

beforeEach(() => {
  for (const model of Object.values(mockPrisma)) {
    for (const method of Object.values(model)) method.mockReset();
  }
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
