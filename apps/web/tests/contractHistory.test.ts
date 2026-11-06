/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type * as DbModule from "@jitaspace/db";

import type * as RouteModule from "../app/api/contracts/history/route";
import type * as HistoryModule from "../app/contracts/history";
import type { ContractHistoryPage } from "~/components/Contracts/history";
import {
  CONTRACT_HISTORY_PAGE_SIZE,
  contractHistorySearch,
  parseContractHistoryQuery,
} from "~/components/Contracts/history";

// The Contracts tab's read, against a stubbed Prisma client with the real SQL
// helpers, and the route that serves it.

jest.mock("next/cache", () => ({ cacheLife: () => undefined }));

type Fn = ReturnType<typeof jest.fn<(...args: unknown[]) => Promise<unknown>>>;
const fn = (): Fn => jest.fn<(...args: unknown[]) => Promise<unknown>>();

const mockPrisma = {
  $queryRaw: fn(),
  contract: { findMany: fn() },
  contractItem: { groupBy: fn() },
  contractBid: { groupBy: fn() },
  station: { findMany: fn() },
};
jest.mock("~/lib/db", () => ({
  prisma: mockPrisma,
  Prisma: jest.requireActual<typeof DbModule>("@jitaspace/db").Prisma,
}));

const { Prisma } = jest.requireActual<typeof DbModule>("@jitaspace/db");

const loadHistory = () =>
  require("../app/contracts/history") as typeof HistoryModule;
const loadGET = () =>
  (require("../app/api/contracts/history/route") as typeof RouteModule).GET;

/** A Contract row as `contractSummarySelect` reads it. */
const contractRow = (contractId: number, overrides = {}) => ({
  contractId,
  type: "ItemExchange",
  title: "",
  issuerId: 90000001,
  issuer: { name: "Issuer" },
  issuerCorporationId: 98000001,
  issuerCorporation: { name: "Corp" },
  forCorporation: false,
  dateIssued: new Date("2026-11-01T00:00:00Z"),
  dateExpired: new Date("2026-11-15T00:00:00Z"),
  daysToComplete: 0,
  volume: 10,
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
  isDeleted: true,
  endReason: "Expired",
  items: [],
  bids: [],
  ...overrides,
});

/** The SQL of the page-id query, with Postgres placeholders. */
const idQuery = () => {
  const [strings, ...values] = mockPrisma.$queryRaw.mock.calls[0] ?? [];
  return Prisma.sql(strings as readonly string[], ...(values as never[]));
};

/** Stubs a page whose id query returns `ids`; rows exist for `rows`. */
function stub(ids: number[], rows = ids) {
  mockPrisma.$queryRaw.mockResolvedValue(
    ids.map((contractId) => ({ contractId })),
  );
  mockPrisma.contract.findMany.mockResolvedValue(
    rows.map((id) => contractRow(id)),
  );
  mockPrisma.contractItem.groupBy.mockResolvedValue([]);
  mockPrisma.contractBid.groupBy.mockResolvedValue([]);
  mockPrisma.station.findMany.mockResolvedValue([]);
}

const range = (from: number, count: number) =>
  Array.from({ length: count }, (_, index) => from - index);

beforeEach(() => {
  for (const model of Object.values(mockPrisma)) {
    if (typeof model === "function") model.mockReset();
    else for (const method of Object.values(model)) method.mockReset();
  }
});

describe("parseContractHistoryQuery", () => {
  const parse = (search: string) =>
    parseContractHistoryQuery(new URLSearchParams(search));

  it("reads one subject, and the page to start below", () => {
    expect(parse("characterId=90000001")).toEqual({
      subject: "character",
      id: 90000001,
      before: null,
    });
    expect(parse("corporationId=98000001&before=250")).toEqual({
      subject: "corporation",
      id: 98000001,
      before: 250,
    });
    expect(parse("typeId=587")?.subject).toBe("type");
  });

  it("refuses no subject, two, or an id that cannot exist", () => {
    for (const search of [
      "",
      "characterId=1&typeId=2",
      "typeId=0",
      "typeId=-3",
      "typeId=1.5",
      "typeId=2147483648",
    ]) {
      expect(parse(search)).toBeNull();
    }
  });

  it("ignores a cursor that is not an id", () => {
    expect(parse("typeId=587&before=abc")?.before).toBeNull();
  });

  it("round-trips the URL the tab sends", () => {
    expect(contractHistorySearch("type", 587, null)).toBe("typeId=587");
    expect(
      parseContractHistoryQuery(
        new URLSearchParams(contractHistorySearch("character", 9, 1234)),
      ),
    ).toEqual({ subject: "character", id: 9, before: 1234 });
  });
});

describe("readContractHistory", () => {
  it.each([
    ["character", `"issuerId" = $1`],
    ["corporation", `"issuerCorporationId" = $1`],
  ] as const)(
    "reads a %s's contracts newest first by id",
    async (subject, condition) => {
      stub([3, 2]);
      await loadHistory().readContractHistory({
        subject,
        id: 42,
        before: null,
      });
      const query = idQuery();
      expect(query.text).toContain(`FROM "Contract"`);
      expect(query.text).toContain(condition);
      expect(query.text).toContain(`ORDER BY "contractId" DESC`);
      // One past a page, to know whether another follows.
      expect(query.values).toEqual([42, CONTRACT_HISTORY_PAGE_SIZE + 1]);
    },
  );

  it("reads a type's contracts once each, below the cursor", async () => {
    stub([3]);
    await loadHistory().readContractHistory({
      subject: "type",
      id: 587,
      before: 100,
    });
    const query = idQuery();
    expect(query.text).toContain(`SELECT DISTINCT "contractId"`);
    expect(query.text).toContain(`FROM "ContractItem"`);
    expect(query.text).toContain(`"typeId" = $1 AND "contractId" < $2`);
    expect(query.values).toEqual([587, 100, CONTRACT_HISTORY_PAGE_SIZE + 1]);
  });

  it("keeps the ids' order and drops a row that vanished", async () => {
    stub([5, 4, 3], [3, 5]);
    const page = await loadHistory().readContractHistory({
      subject: "character",
      id: 1,
      before: null,
    });
    expect(page.contracts.map((c) => c.contractId)).toEqual([5, 3]);
    expect(page.contracts[0]).toMatchObject({
      isOpen: false,
      endReason: "Expired",
    });
    expect(page.nextBefore).toBeNull();
  });

  it("points the next page below a full one", async () => {
    stub(range(1000, CONTRACT_HISTORY_PAGE_SIZE + 1));
    const page = await loadHistory().readContractHistory({
      subject: "type",
      id: 587,
      before: null,
    });
    expect(page.contracts).toHaveLength(CONTRACT_HISTORY_PAGE_SIZE);
    // The page's last id, not the extra one read past it.
    expect(page.nextBefore).toBe(1000 - CONTRACT_HISTORY_PAGE_SIZE + 1);
    expect(mockPrisma.contract.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          contractId: { in: range(1000, CONTRACT_HISTORY_PAGE_SIZE) },
        },
      }),
    );
  });

  it("reads nothing more for a subject with no contracts", async () => {
    stub([]);
    expect(
      await loadHistory().readContractHistory({
        subject: "corporation",
        id: 1,
        before: null,
      }),
    ).toEqual({ contracts: [], nextBefore: null });
    expect(mockPrisma.contract.findMany).not.toHaveBeenCalled();
  });
});

describe("GET /api/contracts/history", () => {
  const get = (search: string) =>
    loadGET()(
      new Request(`https://www.jita.space/api/contracts/history?${search}`),
    );

  it("serves a page, cached at the CDN", async () => {
    stub([7]);
    const response = await get("typeId=587&before=10");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    );
    const body = (await response.json()) as ContractHistoryPage;
    expect(body.contracts.map((c) => c.contractId)).toEqual([7]);
    expect(idQuery().values).toEqual([587, 10, CONTRACT_HISTORY_PAGE_SIZE + 1]);
  });

  it("refuses a request that names no single subject, uncached", async () => {
    const response = await get("characterId=1&corporationId=2");
    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBeNull();
    expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("lets a database failure throw, so nothing is cached", async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error("db down"));
    await expect(get("characterId=1")).rejects.toThrow("db down");
  });
});
