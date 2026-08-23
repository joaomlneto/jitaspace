import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";

import type { scrapeZkillboardRecentKills as ScrapeRecentKills } from "../jobs/scrape/zkillboard/scrapeRecentKills";

// @swc/jest doesn't hoist jest.mock, so the mock fns are declared first and the
// factories close over them; the job is imported lazily in beforeAll (after the
// mocks register). Everything the job touches outside its own logic — Redis,
// Prisma, Discord, the entity resolver and the R2Z2 feed itself — is stubbed,
// so what is under test is the cursor bookkeeping and the reference filter.

const CURSOR_KEY = "zkillboard:r2z2:next-sequence";
const FAILURE_KEY = "zkillboard:r2z2:batch-failures";
const SKIPPED_KEY = "zkillboard:r2z2:skipped-ranges";

let store: Map<string, string>;
let lists: Map<string, string[]>;

const redis = {
  get: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
  set: jest.fn((key: string, value: string) => {
    store.set(key, value);
    return Promise.resolve("OK");
  }),
  del: jest.fn((key: string) => Promise.resolve(store.delete(key) ? 1 : 0)),
  lPush: jest.fn((key: string, value: string) => {
    const list = lists.get(key) ?? [];
    list.unshift(value);
    lists.set(key, list);
    return Promise.resolve(list.length);
  }),
  lTrim: jest.fn(() => Promise.resolve("OK")),
};

const createCorpAndItsRefRecords = jest.fn(() => Promise.resolve(undefined));
const postUpdateCard = jest.fn(() => Promise.resolve(undefined));

const createMany = {
  killmail: jest.fn((args: unknown) => args),
  victim: jest.fn((args: unknown) => args),
  attacker: jest.fn((args: unknown) => args),
  items: jest.fn((args: unknown) => args),
};
const transaction = jest.fn((ops: unknown[]) => Promise.resolve(ops));
const knownTypeIds = new Set<number>();
const knownSolarSystemIds = new Set<number>();
const knownMoonIds = new Set<number>();

const prisma = {
  $transaction: transaction,
  killmail: { createMany: createMany.killmail },
  killmailVictim: { createMany: createMany.victim },
  killmailAttacker: { createMany: createMany.attacker },
  killmailVictimItems: { createMany: createMany.items },
  type: {
    findMany: jest.fn((args: { where: { typeId: { in: number[] } } }) =>
      Promise.resolve(
        args.where.typeId.in
          .filter((id) => knownTypeIds.has(id))
          .map((typeId) => ({ typeId })),
      ),
    ),
  },
  solarSystem: {
    findMany: jest.fn(
      (args: { where: { solarSystemId: { in: number[] } } }) =>
        Promise.resolve(
          args.where.solarSystemId.in
            .filter((id) => knownSolarSystemIds.has(id))
            .map((solarSystemId) => ({ solarSystemId })),
        ),
    ),
  },
  moon: {
    findMany: jest.fn((args: { where: { moonId: { in: number[] } } }) =>
      Promise.resolve(
        args.where.moonId.in
          .filter((id) => knownMoonIds.has(id))
          .map((moonId) => ({ moonId })),
      ),
    ),
  },
};

jest.mock("../kv", () => ({ getRedis: () => Promise.resolve(redis) }));
jest.mock("../db", () => ({ prisma }));
jest.mock("../chat", () => ({ postUpdateCard }));
jest.mock("../helpers/createCorpAndItsRefs.ts", () => ({
  createCorpAndItsRefRecords,
}));

let scrapeZkillboardRecentKills: typeof ScrapeRecentKills;

beforeAll(async () => {
  ({ scrapeZkillboardRecentKills } = await import(
    "../jobs/scrape/zkillboard/scrapeRecentKills"
  ));
});

/** A minimal but schema-shaped R2Z2 package for `sequence`. */
const packageAt = (
  sequence: number,
  {
    shipTypeId = 670,
    itemTypeId = 21898,
    weaponTypeId = 2488,
    solarSystemId = 30001403,
  } = {},
) => ({
  killmail_id: 137000000 + sequence,
  hash: `hash-${sequence}`,
  sequence_id: sequence,
  uploaded_at: 0,
  esi: {
    killmail_id: 137000000 + sequence,
    killmail_time: "2026-08-20T20:06:08Z",
    solar_system_id: solarSystemId,
    victim: {
      character_id: 2124562369,
      corporation_id: 98000001,
      ship_type_id: shipTypeId,
      damage_taken: 2460,
      position: { x: 1, y: 2, z: 3 },
      items: [
        {
          flag: 5,
          item_type_id: itemTypeId,
          quantity_dropped: 7,
          singleton: 0,
        },
      ],
    },
    attackers: [
      {
        character_id: 95000001,
        corporation_id: 98000002,
        ship_type_id: 11365,
        weapon_type_id: weaponTypeId,
        damage_done: 2460,
        final_blow: true,
        security_status: 4.2,
      },
    ],
  },
  zkb: { locationID: 40330952, hash: `hash-${sequence}` },
});

/**
 * Drive one run against a fake feed. `feed` maps a sequence number to its
 * package; anything absent 404s, exactly like R2Z2's ephemeral window.
 */
const run = async ({
  latest,
  feed,
  insertFails = false,
}: {
  latest: number;
  feed: Map<number, unknown>;
  insertFails?: boolean;
}) => {
  transaction.mockImplementation((ops: unknown[]) =>
    insertFails
      ? Promise.reject(new Error("foreign key violation"))
      : Promise.resolve(ops),
  );

  global.fetch = jest.fn((url: unknown) => {
    const target = String(url);
    if (target.endsWith("sequence.json")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: () => Promise.resolve({ sequence: latest }),
      });
    }
    const sequence = Number(target.split("/").pop()?.replace(".json", ""));
    const payload = feed.get(sequence);
    if (!payload) {
      return Promise.resolve({
        ok: false,
        status: 404,
        headers: { get: () => null },
      });
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: () => Promise.resolve(payload),
    });
  }) as unknown as typeof fetch;

  const ctx = {
    payload: {},
    attempt: 1,
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    send: jest.fn(),
    invoke: jest.fn(),
    run: (_name: string, fn: () => unknown) => fn(),
    sleep: jest.fn(),
  } as unknown as Parameters<typeof scrapeZkillboardRecentKills.handler>[0];

  return scrapeZkillboardRecentKills.handler(ctx);
};

const cursor = () => store.get(CURSOR_KEY);
const skipped = () =>
  (lists.get(SKIPPED_KEY) ?? []).map(
    (entry) => JSON.parse(entry) as Record<string, string>,
  );

beforeEach(() => {
  store = new Map([[CURSOR_KEY, "100"]]);
  lists = new Map();
  knownTypeIds.clear();
  knownSolarSystemIds.clear();
  knownMoonIds.clear();
  [670, 21898, 2488, 11365].forEach((id) => knownTypeIds.add(id));
  knownSolarSystemIds.add(30001403);
});

describe("scrape-zkillboard-recent-kills — cursor advance", () => {
  it("steps over a single missing sequence instead of abandoning the tail", async () => {
    // 101 is a hole. The killmail at 102 must still be ingested: the old code
    // broke out at the hole, then fast-forwarded to latest on the next run and
    // lost everything between.
    const feed = new Map<number, unknown>([
      [100, packageAt(100)],
      [102, packageAt(102)],
    ]);

    const result = await run({ latest: 103, feed });

    expect(result).toMatchObject({ processed: 2 });
    expect(cursor()).toBe("103");
    expect(skipped()).toHaveLength(0);
  });

  it("stops at the head without burning requests on unpublished sequences", async () => {
    const feed = new Map<number, unknown>([[100, packageAt(100)]]);

    await run({ latest: 101, feed });

    expect(cursor()).toBe("101");
    // sequence.json, 100, then 101 (the not-yet-published head). Nothing more.
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("fast-forwards and records the range once the feed has aged past the cursor", async () => {
    const result = await run({ latest: 5_000, feed: new Map() });

    expect(result).toMatchObject({ processed: 0 });
    expect(cursor()).toBe("5000");
    expect(skipped()).toEqual([
      expect.objectContaining({
        from: "100",
        to: "4999",
        reason: "expired from the R2Z2 feed",
      }),
    ]);
  });
});

describe("scrape-zkillboard-recent-kills — batch failures", () => {
  const failingRun = () =>
    run({
      latest: 102,
      feed: new Map<number, unknown>([
        [100, packageAt(100)],
        [101, packageAt(101)],
      ]),
      insertFails: true,
    });

  it("retries a failing batch rather than skipping it immediately", async () => {
    await expect(failingRun()).rejects.toThrow("foreign key violation");

    expect(cursor()).toBe("100");
    expect(store.get(FAILURE_KEY)).toBe("100:1");
    expect(skipped()).toHaveLength(0);
  });

  it("quarantines the batch and advances the cursor once retries are exhausted", async () => {
    await expect(failingRun()).rejects.toThrow();
    await expect(failingRun()).rejects.toThrow();
    expect(cursor()).toBe("100");

    await expect(failingRun()).rejects.toThrow();

    // The feed keeps moving: this is the stall the cursor used to hit forever.
    expect(cursor()).toBe("102");
    expect(store.get(FAILURE_KEY)).toBeUndefined();
    expect(skipped()).toEqual([
      expect.objectContaining({
        from: "100",
        to: "101",
        count: "2",
        reason: expect.stringContaining("failed 3 times"),
      }),
    ]);
  });

  it("does not carry a failure count across to a different batch", async () => {
    await expect(failingRun()).rejects.toThrow();
    expect(store.get(FAILURE_KEY)).toBe("100:1");

    store.set(CURSOR_KEY, "200");
    await expect(
      run({
        latest: 201,
        feed: new Map<number, unknown>([[200, packageAt(200)]]),
        insertFails: true,
      }),
    ).rejects.toThrow();

    expect(store.get(FAILURE_KEY)).toBe("200:1");
  });

  it("clears the failure count after a successful run", async () => {
    await expect(failingRun()).rejects.toThrow();
    expect(store.get(FAILURE_KEY)).toBe("100:1");

    await run({
      latest: 102,
      feed: new Map<number, unknown>([
        [100, packageAt(100)],
        [101, packageAt(101)],
      ]),
    });

    expect(store.get(FAILURE_KEY)).toBeUndefined();
    expect(cursor()).toBe("102");
  });
});

describe("scrape-zkillboard-recent-kills — unresolvable references", () => {
  const dataOf = (mock: { mock: { calls: unknown[][] } }) =>
    (mock.mock.calls[0]?.[0] as { data: Record<string, unknown>[] }).data;

  it("drops a killmail whose victim ship type the SDE has not delivered", async () => {
    const feed = new Map<number, unknown>([
      [100, packageAt(100, { shipTypeId: 999999 })],
      [101, packageAt(101)],
    ]);

    const result = await run({ latest: 102, feed });

    expect(result).toMatchObject({ processed: 1 });
    expect(dataOf(createMany.killmail)).toEqual([
      expect.objectContaining({ killmailId: 137000101n }),
    ]);
    // The dropped killmail takes its children with it — no orphans.
    expect(dataOf(createMany.victim)).toHaveLength(1);
    expect(dataOf(createMany.items)).toHaveLength(1);
    expect(cursor()).toBe("102");
  });

  it("drops a killmail whose item type is unknown", async () => {
    const feed = new Map<number, unknown>([
      [100, packageAt(100, { itemTypeId: 999999 })],
    ]);

    const result = await run({ latest: 101, feed });

    expect(result).toMatchObject({ processed: 0 });
  });

  it("nulls an unknown attacker weapon rather than dropping the killmail", async () => {
    const feed = new Map<number, unknown>([
      [100, packageAt(100, { weaponTypeId: 999999 })],
    ]);

    const result = await run({ latest: 101, feed });

    expect(result).toMatchObject({ processed: 1 });
    expect(dataOf(createMany.attacker)).toEqual([
      expect.objectContaining({ weaponTypeId: null, shipTypeId: 11365 }),
    ]);
  });

  it("drops a killmail in a solar system the database does not have", async () => {
    knownSolarSystemIds.clear();
    const feed = new Map<number, unknown>([[100, packageAt(100)]]);

    const result = await run({ latest: 101, feed });

    expect(result).toMatchObject({ processed: 0 });
  });

  it("writes all four tables in one transaction", async () => {
    const feed = new Map<number, unknown>([[100, packageAt(100)]]);

    await run({ latest: 101, feed });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(transaction.mock.calls[0]?.[0]).toHaveLength(4);
  });
});
