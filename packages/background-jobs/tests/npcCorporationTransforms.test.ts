import { describe, expect, it } from "@jest/globals";

// Both modules are runtime-dependency-free (type-only Prisma import; sdeFields
// imports nothing), so these need no p-limit / env mocks.
import { optionalSdeDate, present, subRecord } from "../helpers/sdeFields";
import {
  mergeNpcCorporationChildRows,
  planLegacyEnlistmentMoves,
  toNpcCorporationChildRows,
  toSdeCorporationRow,
} from "../jobs/scrape/sde/npcCorporationTransforms";

const existing = new Set([1000001, 1000002, 1000003]);

describe("toNpcCorporationChildRows", () => {
  it("fans every nested collection out into its own child rows", () => {
    const rows = toNpcCorporationChildRows(
      1000001,
      {
        allowedMemberRaces: [1, 2],
        lpOfferTables: [500, 501],
        divisions: {
          "1": { divisionNumber: 1, leaderID: 3000001, size: 4 },
        },
        investors: { "1000002": 25 },
        corporationTrades: { "34": 1.5 },
        exchangeRates: { "1000003": 0.9 },
      },
      existing,
    );

    expect(rows.allowedRaces).toEqual([
      { corporationId: 1000001, raceId: 1, isDeleted: false },
      { corporationId: 1000001, raceId: 2, isDeleted: false },
    ]);
    expect(rows.lpOfferTables).toEqual([
      { corporationId: 1000001, lpOfferTableId: 500, isDeleted: false },
      { corporationId: 1000001, lpOfferTableId: 501, isDeleted: false },
    ]);
    expect(rows.divisions).toEqual([
      {
        corporationId: 1000001,
        npcCorporationDivisionId: 1,
        divisionNumber: 1,
        leaderId: 3000001,
        size: 4,
        isDeleted: false,
      },
    ]);
    expect(rows.investors).toEqual([
      {
        corporationId: 1000001,
        investorCorporationId: 1000002,
        shares: 25,
        isDeleted: false,
      },
    ]);
    expect(rows.trades).toEqual([
      { corporationId: 1000001, typeId: 34, value: 1.5, isDeleted: false },
    ]);
    expect(rows.exchangeRates).toEqual([
      {
        corporationId: 1000001,
        otherCorporationId: 1000003,
        rate: 0.9,
        isDeleted: false,
      },
    ]);
  });

  it("returns empty arrays when every collection is absent", () => {
    expect(toNpcCorporationChildRows(1000001, {}, existing)).toEqual({
      allowedRaces: [],
      lpOfferTables: [],
      divisions: [],
      investors: [],
      trades: [],
      exchangeRates: [],
    });
  });

  // The FK guard: npcCorporations.yaml references corporations the ESI scrapers
  // may not have fetched, and an unguarded row would fail the foreign key.
  it("drops investors and exchange rates pointing at unknown corporations", () => {
    const rows = toNpcCorporationChildRows(
      1000001,
      {
        investors: { "1000002": 10, "98000001": 90 },
        exchangeRates: { "1000003": 1.1, "98000002": 2.2 },
      },
      existing,
    );

    expect(rows.investors).toEqual([
      {
        corporationId: 1000001,
        investorCorporationId: 1000002,
        shares: 10,
        isDeleted: false,
      },
    ]);
    expect(rows.exchangeRates).toEqual([
      {
        corporationId: 1000001,
        otherCorporationId: 1000003,
        rate: 1.1,
        isDeleted: false,
      },
    ]);
  });

  // Trade type ids and division ids are NOT guarded — they are plain Int
  // columns (the StationOperationService.serviceId precedent), not FKs.
  it("keeps trades and divisions regardless of the corporation set", () => {
    const rows = toNpcCorporationChildRows(
      1000001,
      { corporationTrades: { "34": 1 }, divisions: { "7": {} } },
      new Set(),
    );

    expect(rows.trades).toHaveLength(1);
    expect(rows.divisions).toEqual([
      {
        corporationId: 1000001,
        npcCorporationDivisionId: 7,
        divisionNumber: null,
        leaderId: null,
        size: null,
        isDeleted: false,
      },
    ]);
  });
});

describe("mergeNpcCorporationChildRows", () => {
  it("concatenates each family across corporations in input order", () => {
    const merged = mergeNpcCorporationChildRows([
      toNpcCorporationChildRows(1000001, { allowedMemberRaces: [1] }, existing),
      toNpcCorporationChildRows(
        1000002,
        { allowedMemberRaces: [2, 3] },
        existing,
      ),
    ]);

    expect(merged.allowedRaces).toEqual([
      { corporationId: 1000001, raceId: 1, isDeleted: false },
      { corporationId: 1000002, raceId: 2, isDeleted: false },
      { corporationId: 1000002, raceId: 3, isDeleted: false },
    ]);
    expect(merged.trades).toEqual([]);
  });

  it("returns empty arrays for no corporations", () => {
    expect(mergeNpcCorporationChildRows([])).toEqual({
      allowedRaces: [],
      lpOfferTables: [],
      divisions: [],
      investors: [],
      trades: [],
      exchangeRates: [],
    });
  });
});

describe("subRecord", () => {
  it("returns the sub-object when present", () => {
    expect(subRecord({ heightMap1: 3, population: true })).toEqual({
      heightMap1: 3,
      population: true,
    });
  });

  it("reads absent, null and non-object values as empty", () => {
    expect(subRecord(undefined)).toEqual({});
    expect(subRecord(null)).toEqual({});
    expect(subRecord(7)).toEqual({});
    expect(subRecord("x")).toEqual({});
  });
});

describe("optionalSdeDate", () => {
  // The SDE writes "2003-03-27 13:27:00" with no zone; EVE records UTC, so a
  // naive `new Date(...)` would shift by the runner's offset.
  it("parses a space-separated SDE timestamp as UTC", () => {
    expect(optionalSdeDate("2003-03-27 13:27:00")?.toISOString()).toBe(
      "2003-03-27T13:27:00.000Z",
    );
  });

  it("returns null for absent, empty and unparseable values", () => {
    expect(optionalSdeDate(undefined)).toBeNull();
    expect(optionalSdeDate(null)).toBeNull();
    expect(optionalSdeDate("")).toBeNull();
    expect(optionalSdeDate(20030327)).toBeNull();
    expect(optionalSdeDate("not a date")).toBeNull();
  });
});

describe("present", () => {
  const ids = new Set([1, 2]);

  it("keeps an id the set holds and nulls one it does not", () => {
    expect(present(ids, 2)).toBe(2);
    expect(present(ids, 3)).toBeNull();
    expect(present(ids, null)).toBeNull();
  });
});

describe("toSdeCorporationRow", () => {
  const factionIds = new Set([500001, 500010]);

  it("stores the SDE factionID as the corporation's own faction", () => {
    // CBD Corporation: npcCorporations.yaml lists it under the Caldari State.
    const row = toSdeCorporationRow(
      { factionID: 500001, extent: "N", size: "H", uniqueName: true },
      1000002,
      factionIds,
    );
    expect(row).toMatchObject({
      corporationId: 1000002,
      factionId: 500001,
      extent: "N",
      size: "H",
      isUnique: true,
    });
  });

  it("nulls a faction the Faction table does not have, or none at all", () => {
    expect(
      toSdeCorporationRow({ factionID: 999 }, 1, factionIds).factionId,
    ).toBeNull();
    expect(toSdeCorporationRow({}, 1, factionIds).factionId).toBeNull();
  });

  it("never writes the ESI-owned columns", () => {
    const row = toSdeCorporationRow(
      { factionID: 500001, ceoID: 3004049, taxRate: 0.1, tickerName: "CBD" },
      1000002,
      factionIds,
    );
    for (const key of ["name", "memberCount", "ticker", "taxRate", "ceoId"]) {
      expect(row).not.toHaveProperty(key);
    }
    expect(row).not.toHaveProperty("enlistedFactionId");
  });
});

describe("planLegacyEnlistmentMoves", () => {
  it("moves each legacy factionId into enlistedFactionId, grouped by faction", () => {
    const { moves, clear } = planLegacyEnlistmentMoves([
      { corporationId: 98000001, factionId: 500001, enlistedFactionId: null },
      { corporationId: 98000002, factionId: 500002, enlistedFactionId: null },
      { corporationId: 98000003, factionId: 500001, enlistedFactionId: null },
    ]);
    expect([...moves]).toEqual([
      [500001, [98000001, 98000003]],
      [500002, [98000002]],
    ]);
    expect(clear).toEqual([98000001, 98000002, 98000003]);
  });

  it("keeps an enlistedFactionId ESI has already refreshed, but still clears", () => {
    const { moves, clear } = planLegacyEnlistmentMoves([
      { corporationId: 98000001, factionId: 500001, enlistedFactionId: 500004 },
    ]);
    expect(moves.size).toBe(0);
    expect(clear).toEqual([98000001]);
  });

  it("is a no-op once every legacy value is gone", () => {
    const { moves, clear } = planLegacyEnlistmentMoves([
      { corporationId: 98000001, factionId: null, enlistedFactionId: 500001 },
    ]);
    expect(moves.size).toBe(0);
    expect(clear).toEqual([]);
  });
});
