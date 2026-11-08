import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import type { JobLogger } from "../core";
import type { RegionHistory } from "../helpers/contractTimeline";
import type {
  AppliedListing,
  RegionListing,
} from "../helpers/contractTimelineStore";
import type { syncPublicContracts as SyncPublicContracts } from "../jobs/scrape/esi/syncPublicContracts";

// @swc/jest doesn't hoist jest.mock, so the mock fns are declared first and the
// factories close over them; the module is imported lazily in beforeAll.
interface Res {
  data: unknown;
  status: number;
  headers: Record<string, string>;
}
const httpError = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), {
    response: { status, headers: {} },
  });

const LM = "Tue, 03 Nov 2026 21:08:12 GMT";
let regionPages: Record<number, (page: number) => Promise<Res>>;
let items: Record<number, () => Promise<Res>>;
let bids: Record<number, () => Promise<Res>>;
const getRegion = jest.fn((regionId: number, params: { page: number }) =>
  regionPages[regionId]!(params.page),
);
const getItems = jest.fn((contractId: number) => items[contractId]!());
const getBids = jest.fn((contractId: number) => bids[contractId]!());
let dynamicFails = false;
const getDynamic = jest.fn((_itemId: number, _typeId: number) =>
  dynamicFails
    ? Promise.reject(httpError(503))
    : Promise.resolve<Res>({
        status: 200,
        headers: {},
        data: {
          created_by: 2113147205,
          source_type_id: 10,
          mutator_type_id: 11,
          dogma_attributes: [{ attribute_id: 64, value: 1.09 }],
          dogma_effects: [{ effect_id: 11, is_default: false }],
        },
      }),
);
const setUserAgent = jest.fn();
jest.mock("@jitaspace/esi-client", () => ({
  getConfig: () => ({}),
  setUserAgent: (ua: string) => setUserAgent(ua),
  getContractsPublicRegionId: (id: number, params: { page: number }) =>
    getRegion(id, params),
  getContractsPublicItemsContractId: (id: number) => getItems(id),
  getContractsPublicBidsContractId: (id: number) => getBids(id),
  getDogmaDynamicItemsTypeIdItemId: (itemId: number, typeId: number) =>
    getDynamic(itemId, typeId),
}));

const store = new Map<string, string>();
jest.mock("../kv", () => ({
  getRedis: () =>
    Promise.resolve({
      get: (k: string) => Promise.resolve(store.get(k) ?? null),
      set: (k: string, v: string) => {
        store.set(k, v);
        return Promise.resolve("OK");
      },
    }),
}));

/** Every call, in order, across the store and the write helpers. */
const calls: string[] = [];
let storedIds: Set<number>;
let withItems: Set<number>;
/** Regions whose next listing the store mock reports as incomplete. */
let incompleteRegions: Set<number>;
/** Regions whose listing the store mock skips (a stale copy). */
let skippedRegions: Set<number>;
const applyListing = jest.fn(
  (listing: RegionListing, history: RegionHistory | null) => {
    calls.push(`apply ${listing.regionId}`);
    if (skippedRegions.has(listing.regionId)) {
      return Promise.resolve<AppliedListing>({
        regionId: listing.regionId,
        skipped: true,
        complete: false,
        inserted: [],
        reopened: [],
        ended: [],
        history,
      });
    }
    const inserted = listing.contracts
      .map((c) => c.contractId)
      .filter((id) => !storedIds.has(id));
    for (const id of inserted) storedIds.add(id);
    const complete = !incompleteRegions.has(listing.regionId);
    return Promise.resolve<AppliedListing>({
      regionId: listing.regionId,
      skipped: false,
      complete,
      inserted,
      reopened: [],
      ended: [],
      history: {
        lastModified: listing.observedAt,
        lastCompleteAt: complete
          ? listing.observedAt
          : (history?.lastCompleteAt ?? null),
        counts: [...(history?.counts ?? []), listing.contracts.length],
      },
    });
  },
);
const checkpoint = jest.fn(
  (_regions: { regionId: number; lastCompleteAt: number }[]) => {
    calls.push("checkpoint");
    return Promise.resolve(0);
  },
);
jest.mock("../helpers/contractTimelineStore.ts", () => ({
  applyRegionListing: (l: RegionListing, h: RegionHistory | null) =>
    applyListing(l, h),
  checkpointContractTimeline: (
    regions: { regionId: number; lastCompleteAt: number }[],
  ) => checkpoint(regions),
}));
const ensureReferences = jest.fn((_refs: unknown) => {
  calls.push("references");
  return Promise.resolve(0);
});
const writeItems = jest.fn((args: { contracts: { contractId: number }[] }) => {
  calls.push("items");
  for (const c of args.contracts) withItems.add(c.contractId);
  return Promise.resolve({
    written: args.contracts.map((c) => c.contractId),
    blocked: [] as number[],
  });
});
const writeBids = jest.fn((_bids: unknown[]) => {
  calls.push("bids");
  return Promise.resolve();
});
jest.mock("../helpers/publicContractsDb.ts", () => ({
  ensureReferences: (refs: unknown) => ensureReferences(refs),
  stationSystemsOf: () => Promise.resolve(new Map([[60003760, 30000142]])),
  storedContractIdsOf: (ids: number[]) =>
    Promise.resolve(new Set(ids.filter((id) => storedIds.has(id)))),
  contractsWithItemsOf: (ids: number[]) =>
    Promise.resolve(new Set(ids.filter((id) => withItems.has(id)))),
  itemlessContractsOf: (ids: number[]) =>
    Promise.resolve(
      ids.filter((id) => storedIds.has(id) && !withItems.has(id)),
    ),
  mutatedItemsOf: (
    contracts: {
      contractId: number;
      items: { item_id?: number; type_id: number }[];
    }[],
  ) =>
    Promise.resolve({
      mutated: contracts.flatMap((c) =>
        c.items
          .filter((i) => i.type_id === 47702)
          .map((i) => ({
            contractId: c.contractId,
            itemId: i.item_id!,
            typeId: i.type_id,
          })),
      ),
      known: new Set<number>(),
    }),
  writeContractItems: (args: { contracts: { contractId: number }[] }) =>
    writeItems(args),
  writeContractBids: (b: unknown[]) => writeBids(b),
}));

const prisma = {
  region: {
    findMany: () =>
      Promise.resolve([{ regionId: 10000001 }, { regionId: 10000002 }]),
  },
  contract: {
    findMany: (args: { where: { contractId?: { in: number[] } } }) =>
      Promise.resolve(
        (args.where.contractId?.in ?? []).map((contractId) => ({ contractId })),
      ),
  },
  $queryRaw: () => Promise.resolve([]),
};
jest.mock("../db", () => ({ prisma }));

let job: typeof SyncPublicContracts;
let STATE_KEY: string;
beforeAll(async () => {
  const mod = await import("../jobs/scrape/esi/syncPublicContracts");
  job = mod.syncPublicContracts;
  STATE_KEY = mod.PUBLIC_CONTRACTS_STATE_KEY;
});

const logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} satisfies JobLogger;
const run = () =>
  job.handler({
    payload: {},
    logger,
    attempt: 1,
    run: (_name, fn) => fn(),
    send: () => Promise.resolve(),
    invoke: () => Promise.reject(new Error("unused")),
    sleep: () => Promise.resolve(),
  }) as Promise<{ stats: Record<string, unknown> }>;

const listing = (contracts: unknown[], lastModified = LM): Res => ({
  status: 200,
  headers: { "x-pages": "1", "last-modified": lastModified },
  data: contracts,
});
const base = {
  date_issued: "2026-10-28T00:00:00Z",
  date_expired: "2026-12-01T00:00:00Z",
  issuer_id: 90000001,
  issuer_corporation_id: 98000001,
  start_location_id: 60003760,
  end_location_id: 60003760,
  price: 1,
  reward: 0,
  collateral: 0,
  volume: 1,
  days_to_complete: 0,
  title: "",
};
const ITEM_EXCHANGE = { ...base, contract_id: 101, type: "item_exchange" };
const COURIER = {
  ...base,
  contract_id: 102,
  type: "courier",
  end_location_id: 60008494,
};
const AUCTION = {
  ...base,
  contract_id: 103,
  type: "auction",
  start_location_id: 1035466617946,
  buyout: 0,
};
const state = () =>
  JSON.parse(store.get(STATE_KEY)!) as {
    regions: Record<string, RegionHistory>;
    itemsPending: Record<string, number>;
    lastCheckpointAt: number;
  };

beforeEach(() => {
  dynamicFails = false;
  incompleteRegions = new Set();
  skippedRegions = new Set();
  store.clear();
  calls.length = 0;
  storedIds = new Set();
  withItems = new Set();
  regionPages = {
    10000001: () => Promise.resolve(listing([])),
    10000002: () => Promise.resolve(listing([ITEM_EXCHANGE, COURIER, AUCTION])),
  };
  items = {
    101: () =>
      Promise.resolve({
        status: 200,
        headers: {},
        data: [
          {
            record_id: 1,
            type_id: 34,
            quantity: 10,
            is_included: true,
            item_id: 5000,
          },
          {
            record_id: 2,
            type_id: 47702,
            quantity: 1,
            is_included: true,
            item_id: 1055232337272,
          },
        ],
      }),
    103: () => Promise.reject(httpError(403)),
  };
  bids = {
    103: () =>
      Promise.resolve({
        status: 200,
        headers: {},
        data: [{ bid_id: 7, amount: 5e6, date_bid: "2026-10-30T17:59:23Z" }],
      }),
  };
});

describe("esi-sync-public-contracts", () => {
  it("stores references, then applies each region's listing, then items and bids", async () => {
    const { stats } = await run();
    expect(stats).toMatchObject({ observed: 2, inserted: 3 });
    expect(setUserAgent).toHaveBeenCalledWith(
      expect.stringContaining("JitaSpace"),
    );
    // References first; regions one at a time; the daily checkpoint on a
    // first run; then items and bids.
    expect(calls).toEqual([
      "references",
      "apply 10000001",
      "apply 10000002",
      "checkpoint",
      "items",
      "bids",
    ]);
    expect(ensureReferences).toHaveBeenCalledWith({
      characterIds: [90000001, 90000001, 90000001],
      corporationIds: [98000001, 98000001, 98000001],
      stationIds: [60003760, 60003760],
    });

    const forge = applyListing.mock.calls.find(
      ([l]) => l.regionId === 10000002,
    )![0];
    expect(forge.observedAt).toBe(Date.parse(LM));
    expect(
      forge.contracts.map((c) => [c.contractId, c.stationId, c.solarSystemId]),
    ).toEqual([
      [101, 60003760, 30000142],
      [102, 60003760, 30000142],
      // In a player structure: neither.
      [103, null, null],
    ]);
  });

  it("fetches items only for item exchanges and auctions, and mutated items by (item, type)", async () => {
    await run();
    expect(getItems.mock.calls.map(([id]) => id).sort()).toEqual([101, 103]);
    expect(getDynamic).toHaveBeenCalledWith(1055232337272, 47702);
    expect(
      writeItems.mock.calls[0]![0].contracts.map((c) => c.contractId),
    ).toEqual([101]);
    expect(getBids.mock.calls.map(([id]) => id)).toEqual([103]);
    expect(writeBids).toHaveBeenCalledWith([
      {
        contractId: 103,
        bidId: 7,
        amount: 5e6,
        dateBid: "2026-10-30T17:59:23Z",
      },
    ]);
  });

  it("does not ask again for six hours when ESI answers 403", async () => {
    await run();
    expect(Object.keys(state().itemsPending)).toEqual(["103"]);
    expect(state().itemsPending[103]).toBeGreaterThan(
      Date.now() + 5 * 3600_000,
    );
    getItems.mockClear();
    await run();
    expect(getItems).not.toHaveBeenCalled();
  });

  it("skips contracts whose items another source already stored", async () => {
    withItems = new Set([101]);
    await run();
    expect(getItems.mock.calls.map(([id]) => id)).toEqual([103]);
  });

  it("keeps a contract queued when its mutated item fails transiently", async () => {
    jest.useFakeTimers();
    try {
      dynamicFails = true;
      const pending = run();
      await jest.advanceTimersByTimeAsync(60_000);
      await pending;
    } finally {
      jest.useRealTimers();
    }
    expect(writeItems.mock.calls[0]?.[0].contracts ?? []).toEqual([]);
    expect(state().itemsPending[101]).toBe(0);
  });

  it("keeps each region's history between runs and hands it back", async () => {
    await run();
    expect(state().regions).toEqual({
      10000001: {
        lastModified: Date.parse(LM),
        lastCompleteAt: Date.parse(LM),
        counts: [0],
      },
      10000002: {
        lastModified: Date.parse(LM),
        lastCompleteAt: Date.parse(LM),
        counts: [3],
      },
    });
    expect(applyListing.mock.calls.map(([, h]) => h)).toEqual([null, null]);

    applyListing.mockClear();
    const next = "Tue, 03 Nov 2026 21:38:12 GMT";
    regionPages[10000002] = () =>
      Promise.resolve(listing([ITEM_EXCHANGE], next));
    incompleteRegions = new Set([10000002]);
    const { stats } = await run();
    expect(applyListing.mock.calls.map(([, h]) => h?.counts)).toEqual([
      [0],
      [3],
    ]);
    expect(stats).toMatchObject({ incompleteRegions: [10000002] });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("incomplete"),
      { regionIds: [10000002] },
    );
    // An incomplete listing moves lastModified on, not lastCompleteAt.
    expect(state().regions[10000002]).toEqual({
      lastModified: Date.parse(next),
      lastCompleteAt: Date.parse(LM),
      counts: [3, 1],
    });
  });

  it("checkpoints each region at its last complete listing", async () => {
    incompleteRegions = new Set([10000001]);
    await run();
    expect(checkpoint).toHaveBeenCalledWith([
      { regionId: 10000002, lastCompleteAt: Date.parse(LM) },
    ]);
  });

  it("queues the items of contracts an earlier, failed attempt stored", async () => {
    // The last attempt committed region 10000002, then failed before saving
    // its state: the contracts are stored, so this one inserts none of them.
    storedIds = new Set([101, 102, 103]);
    store.set(
      STATE_KEY,
      JSON.stringify({ regions: {}, itemsPending: {}, lastCheckpointAt: 0 }),
    );
    const { stats } = await run();
    expect(stats).toMatchObject({ inserted: 0 });
    expect(getItems.mock.calls.map(([id]) => id).sort()).toEqual([101, 103]);
    expect(
      writeItems.mock.calls[0]![0].contracts.map((c) => c.contractId),
    ).toEqual([101]);
  });

  it("does not queue contracts whose items are stored, or that are not stored", async () => {
    // A skipped stale listing shows 104, an item exchange never stored.
    const unstored = { ...ITEM_EXCHANGE, contract_id: 104 };
    regionPages[10000002] = () =>
      Promise.resolve(listing([ITEM_EXCHANGE, COURIER, AUCTION, unstored]));
    items[104] = () => Promise.resolve({ status: 200, headers: {}, data: [] });
    storedIds = new Set([101, 103]);
    withItems = new Set([101]);
    store.set(
      STATE_KEY,
      JSON.stringify({ regions: {}, itemsPending: {}, lastCheckpointAt: 0 }),
    );
    skippedRegions = new Set([10000002]);
    await run();
    // Only 103 is stored and itemless: 101 has items, 104 is not stored.
    // (103's 403 leaves it queued, deferred.)
    expect(Object.keys(state().itemsPending)).toEqual(["103"]);
    expect(getItems.mock.calls.map(([id]) => id)).toEqual([103]);
  });

  it("fetches no bids for an auction a skipped listing shows but nothing stored", async () => {
    // Ending within the hour: its bids would be fetched if it were stored.
    const ending = {
      ...AUCTION,
      date_expired: new Date(Date.now() + 3600_000).toISOString(),
    };
    regionPages[10000002] = () => Promise.resolve(listing([ending]));
    skippedRegions = new Set([10000002]);
    await run();
    expect(getBids).not.toHaveBeenCalled();
    expect(writeBids).toHaveBeenCalledWith([]);
  });

  it("checkpoints at most once a day", async () => {
    await run();
    calls.length = 0;
    await run();
    expect(calls).not.toContain("checkpoint");
  });

  it("changes nothing when ESI is down", async () => {
    regionPages = {
      10000001: () => Promise.reject(httpError(503)),
      10000002: () => Promise.reject(httpError(503)),
    };
    // The gate backs off between retries; skip the waiting.
    jest.useFakeTimers();
    try {
      const pending = run();
      await jest.advanceTimersByTimeAsync(60_000);
      const { stats } = await pending;
      expect(stats).toMatchObject({ observed: 0 });
    } finally {
      jest.useRealTimers();
    }
    expect(getRegion).toHaveBeenCalledTimes(8);
    expect(calls).toEqual([]);
    expect(store.size).toBe(0);
  });

  it("fetches a region again when a later page is gone, as when it shrank", async () => {
    let attempt = 0;
    regionPages = {
      10000001: () => Promise.resolve(listing([])),
      10000002: (page) => {
        if (page === 1) attempt++;
        if (attempt === 1) {
          return page === 1
            ? Promise.resolve({
                ...listing([ITEM_EXCHANGE]),
                headers: { "x-pages": "2", "last-modified": LM },
              })
            : Promise.reject(httpError(404));
        }
        return Promise.resolve(listing([ITEM_EXCHANGE]));
      },
    };
    const { stats } = await run();
    expect(attempt).toBe(2);
    expect(stats).toMatchObject({ observed: 2, failedRegions: [] });
  });

  it("gives up on a region whose later page keeps failing", async () => {
    regionPages = {
      10000001: () => Promise.resolve(listing([])),
      10000002: (page) =>
        page === 1
          ? Promise.resolve({
              ...listing([ITEM_EXCHANGE]),
              headers: { "x-pages": "2", "last-modified": LM },
            })
          : Promise.reject(httpError(404)),
    };
    const { stats } = await run();
    expect(stats).toMatchObject({ observed: 1, failedRegions: [10000002] });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("unavailable"),
      { regionId: 10000002, reason: "HTTP 404 on a later page" },
    );
  });

  it("gives up on a region whose pages keep changing while it paginates", async () => {
    let call = 0;
    regionPages = {
      10000001: () => Promise.resolve(listing([])),
      10000002: (page) =>
        Promise.resolve({
          ...listing(page === 1 ? [ITEM_EXCHANGE] : [COURIER]),
          headers: {
            "x-pages": "2",
            "last-modified": `Tue, 03 Nov 2026 21:0${page === 1 ? 8 : 9}:${String(++call).padStart(2, "0")} GMT`,
          },
        }),
    };
    const { stats } = await run();
    expect(stats).toMatchObject({ observed: 1, failedRegions: [10000002] });
    expect(applyListing.mock.calls.map(([l]) => l.regionId)).toEqual([
      10000001,
    ]);
  });
});
