import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import type { JobLogger } from "../core";
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
const getDynamic = jest.fn((itemId: number, typeId: number) =>
  Promise.resolve<Res>({
    status: 200,
    headers: {},
    data: {
      created_by: 2113147205,
      source_type_id: 10,
      mutator_type_id: 11,
      dogma_attributes: [{ attribute_id: 64, value: 1.09 }],
      dogma_effects: [{ effect_id: 11, is_default: false }],
      itemId,
      typeId,
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

const ensureRefs = jest.fn((_refs: unknown) => Promise.resolve());
jest.mock("../helpers/createCorpAndItsRefs.ts", () => ({
  createCorpAndItsRefRecords: (refs: unknown) => ensureRefs(refs),
}));

/** Raw statements run, by their first line. */
const executed: { sql: string; values: unknown[] }[] = [];
const sqlOf = (strings: TemplateStringsArray) =>
  strings.join("?").replace(/\s+/g, " ").trim();
let outstanding: unknown[];
const findMany = (rows: () => unknown[]) =>
  jest.fn((_args?: unknown) => Promise.resolve(rows()));
const prisma = {
  region: { findMany: findMany(() => [{ regionId: 10000002 }]) },
  contract: {
    findMany: jest.fn((args: { where: { isDeleted?: boolean } }) =>
      Promise.resolve(args.where.isDeleted === false ? outstanding : []),
    ),
  },
  character: { findMany: findMany(() => []) },
  corporation: { findMany: findMany(() => []) },
  station: {
    findMany: findMany(() => [
      { stationId: 60003760, solarSystemId: 30000142 },
    ]),
  },
  type: {
    findMany: jest.fn(
      (args: {
        where: { isDynamicType?: boolean; typeId?: { in: number[] } };
      }) =>
        Promise.resolve(
          args.where.isDynamicType
            ? [{ typeId: 47702 }]
            : (args.where.typeId?.in ?? []).map((typeId) => ({ typeId })),
        ),
    ),
  },
  dynamicItemAttributeMapping: { findMany: findMany(() => []) },
  dynamicItem: { findMany: findMany(() => []) },
  dogmaAttribute: { findMany: findMany(() => [{ attributeId: 64 }]) },
  dogmaEffect: { findMany: findMany(() => [{ effectId: 11 }]) },
  $queryRaw: jest.fn((_s: TemplateStringsArray, ..._v: unknown[]) =>
    Promise.resolve([]),
  ),
  $executeRaw: jest.fn(
    (strings: TemplateStringsArray, ...values: unknown[]) => {
      executed.push({ sql: sqlOf(strings), values });
      return Promise.resolve(1);
    },
  ),
  $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
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

beforeEach(() => {
  store.clear();
  executed.length = 0;
  outstanding = [];
  regionPages = {
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
  it("stores new contracts, their items and mutated items, and bids", async () => {
    const { stats } = await run();
    expect(stats).toMatchObject({ observed: 1, inserted: 3, ended: 0 });
    expect(setUserAgent).toHaveBeenCalledWith(
      expect.stringContaining("JitaSpace"),
    );

    const insert = executed.find((e) =>
      e.sql.startsWith('INSERT INTO "Contract"'),
    )!;
    expect(insert.values[0]).toEqual([101, 102, 103]);
    // Station and system only for the NPC station; the structure has neither.
    expect(insert.values[13]).toEqual([30000142, 30000142, null]);
    expect(insert.values[14]).toEqual([60003760, 60003760, null]);
    expect(ensureRefs).toHaveBeenCalledWith(
      expect.objectContaining({ missingCharacterIds: new Set([90000001]) }),
    );

    // Items only for the item exchange and the auction; never the courier.
    expect(getItems.mock.calls.map(([id]) => id).sort()).toEqual([101, 103]);
    // Dynamic dogma by (item, type), the generated client's argument order.
    expect(getDynamic).toHaveBeenCalledWith(1055232337272, 47702);
    const tables = executed.map((e) => e.sql.split(" ")[2]);
    expect(tables).toEqual(
      expect.arrayContaining([
        '"ContractItem"',
        '"DynamicItem"',
        '"DynamicItemDogmaAttribute"',
        '"DynamicItemDogmaEffect"',
        '"ContractDynamicItem"',
        '"ContractBid"',
      ]),
    );
    expect(getBids.mock.calls.map(([id]) => id)).toEqual([103]);

    // The auction's items answered 403: not asked again for six hours.
    const state = JSON.parse(store.get(STATE_KEY)!) as {
      itemsPending: Record<string, number>;
    };
    expect(Object.keys(state.itemsPending)).toEqual(["103"]);
    expect(state.itemsPending[103]).toBeGreaterThan(Date.now() + 5 * 3600_000);
  });

  it("asks ESI for nothing more when the listing has not changed", async () => {
    await run();
    getItems.mockClear();
    executed.length = 0;
    outstanding = [101, 102, 103].map((contractId) => ({
      contractId,
      regionId: 10000002,
      type:
        contractId === 102
          ? "Courier"
          : contractId === 103
            ? "Auction"
            : "ItemExchange",
      dateIssued: new Date(base.date_issued),
      dateExpired: new Date(base.date_expired),
      firstSeenAt: new Date(LM),
      lastSeenAt: new Date(LM),
    }));
    const { stats } = await run();
    expect(stats).toMatchObject({ inserted: 0, ended: 0, unchangedRegions: 1 });
    expect(getItems).not.toHaveBeenCalled();
    expect(executed.filter((e) => !e.sql.includes('"ContractBid"'))).toEqual(
      [],
    );
  });

  it("changes nothing when ESI is down", async () => {
    regionPages = { 10000002: () => Promise.reject(httpError(503)) };
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
    expect(getRegion).toHaveBeenCalledTimes(4);
    expect(executed).toEqual([]);
    expect(store.size).toBe(0);
  });

  it("gives up on a region whose pages keep changing while it paginates", async () => {
    let call = 0;
    regionPages = {
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
    expect(stats).toMatchObject({ observed: 0 });
    expect(getRegion).toHaveBeenCalledTimes(4);
    expect(executed).toEqual([]);
  });
});
