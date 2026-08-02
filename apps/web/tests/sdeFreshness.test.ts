/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// `~/lib/sdeFreshness` reads Prisma at module scope, so the client is stubbed
// before the module under test is required (jest.mock is not hoisted above
// imports here — see the lazy `require` in `loadModule` below).
const mockAggregate = jest.fn();

jest.mock("~/lib/db", () => ({
  prisma: {
    blueprint: {
      aggregate: (...a: unknown[]) => mockAggregate("blueprint", ...a),
    },
    certificate: {
      aggregate: (...a: unknown[]) => mockAggregate("certificate", ...a),
    },
    skin: { aggregate: (...a: unknown[]) => mockAggregate("skin", ...a) },
    typeMaterial: {
      aggregate: (...a: unknown[]) => mockAggregate("typeMaterial", ...a),
    },
    landmark: {
      aggregate: (...a: unknown[]) => mockAggregate("landmark", ...a),
    },
  },
}));

function loadModule() {
  return require("~/lib/sdeFreshness") as typeof import("~/lib/sdeFreshness");
}

/** Resolve each sampled table to the given `updatedAt` (keyed by table name). */
function stubTables(byTable: Record<string, Date | null>) {
  mockAggregate.mockImplementation((table: unknown) =>
    Promise.resolve({ _max: { updatedAt: byTable[table as string] ?? null } }),
  );
}

describe("newestDate", () => {
  const { newestDate } = loadModule();

  it("returns the latest of several dates", () => {
    const oldest = new Date("2026-01-01T00:00:00Z");
    const newest = new Date("2026-07-31T00:00:00Z");
    expect(newestDate([oldest, newest, new Date("2026-03-01T00:00:00Z")])).toBe(
      newest,
    );
  });

  it("ignores null and undefined entries", () => {
    const only = new Date("2026-05-05T00:00:00Z");
    expect(newestDate([null, only, undefined])).toBe(only);
  });

  it("returns null when there is nothing to compare", () => {
    expect(newestDate([])).toBeNull();
    expect(newestDate([null, undefined])).toBeNull();
  });

  it("is order-independent", () => {
    const a = new Date("2026-02-01T00:00:00Z");
    const b = new Date("2026-08-01T00:00:00Z");
    expect(newestDate([a, b])).toBe(b);
    expect(newestDate([b, a])).toBe(b);
  });

  it("keeps the first of two equal dates rather than flapping", () => {
    const first = new Date("2026-04-01T00:00:00Z");
    const second = new Date("2026-04-01T00:00:00Z");
    expect(newestDate([first, second])).toBe(first);
  });
});

describe("SDE_FRESHNESS_TABLES", () => {
  const { SDE_FRESHNESS_TABLES } = loadModule();

  // The whole point of the sample is that it excludes tables the ESI scrapers
  // also write — those would report the SDE as fresher than it is.
  it("samples only SDE-owned tables", () => {
    expect([...SDE_FRESHNESS_TABLES]).toEqual([
      "blueprint",
      "certificate",
      "skin",
      "typeMaterial",
      "landmark",
    ]);
  });

  it("excludes tables the ESI scrapers also write", () => {
    for (const coOwned of ["type", "solarSystem", "dogmaAttribute", "race"]) {
      expect([...SDE_FRESHNESS_TABLES]).not.toContain(coOwned);
    }
  });
});

describe("getSdeDataUpdatedAt", () => {
  beforeEach(() => {
    mockAggregate.mockReset();
  });

  it("returns the newest updatedAt across every sampled table, as an ISO string", async () => {
    const { getSdeDataUpdatedAt } = loadModule();
    stubTables({
      blueprint: new Date("2026-01-01T00:00:00Z"),
      certificate: new Date("2026-07-31T13:29:31Z"),
      skin: new Date("2026-03-15T00:00:00Z"),
      typeMaterial: new Date("2026-02-02T00:00:00Z"),
      landmark: new Date("2026-05-05T00:00:00Z"),
    });

    await expect(getSdeDataUpdatedAt()).resolves.toBe(
      "2026-07-31T13:29:31.000Z",
    );
  });

  it("queries every table in the sample", async () => {
    const { getSdeDataUpdatedAt, SDE_FRESHNESS_TABLES } = loadModule();
    stubTables({ blueprint: new Date("2026-01-01T00:00:00Z") });

    await getSdeDataUpdatedAt();

    const queried = mockAggregate.mock.calls.map((call) => call[0]);
    expect(queried).toEqual([...SDE_FRESHNESS_TABLES]);
  });

  it("asks only for the max updatedAt", async () => {
    const { getSdeDataUpdatedAt } = loadModule();
    stubTables({ blueprint: new Date("2026-01-01T00:00:00Z") });

    await getSdeDataUpdatedAt();

    for (const call of mockAggregate.mock.calls) {
      expect(call[1]).toEqual({ _max: { updatedAt: true } });
    }
  });

  it("tolerates empty tables, using whichever table does have rows", async () => {
    const { getSdeDataUpdatedAt } = loadModule();
    stubTables({ landmark: new Date("2026-06-06T12:00:00Z") });

    await expect(getSdeDataUpdatedAt()).resolves.toBe(
      "2026-06-06T12:00:00.000Z",
    );
  });

  it("returns null when every sampled table is empty", async () => {
    const { getSdeDataUpdatedAt } = loadModule();
    stubTables({});

    await expect(getSdeDataUpdatedAt()).resolves.toBeNull();
  });
});
