import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import type {
  InsurancePriceRow,
  InsurancePriceValues,
} from "../helpers/planInsurancePriceUpdates.ts";
import type { recordInsurancePriceSnapshot as Record_ } from "../helpers/recordInsurancePriceSnapshot.ts";

// An in-memory stand-in for the few Prisma calls the recorder makes, so the
// order observations arrive in can be checked end to end: whatever the order,
// the table must come out as if they had been recorded oldest first.
interface Snapshot {
  observedAt: Date;
  source: string;
  typeCount: number;
}
let snapshots: Snapshot[] = [];
let rows: InsurancePriceRow[] = [];

type Where = Record<string, unknown>;
const t = (d: unknown) => (d as Date).getTime();
const containsAt = (row: InsurancePriceRow, where: Where) => {
  const at = t((where.validFrom as { lte: Date }).lte);
  return (
    t(row.validFrom) <= at &&
    (row.validUntil === null || t(row.validUntil) > at)
  );
};

const tx = {
  insurancePriceSnapshot: {
    findUnique: ({ where }: { where: { observedAt: Date } }) =>
      Promise.resolve(
        snapshots.find((s) => t(s.observedAt) === t(where.observedAt)) ?? null,
      ),
    findFirst: ({ where }: { where: { observedAt: { gt: Date } } }) =>
      Promise.resolve(
        snapshots
          .filter((s) => t(s.observedAt) > t(where.observedAt.gt))
          .sort((a, b) => t(a.observedAt) - t(b.observedAt))[0] ?? null,
      ),
    createMany: ({ data }: { data: Snapshot[] }) => {
      snapshots.push(...data);
      return Promise.resolve({ count: data.length });
    },
  },
  insurancePrice: {
    findMany: ({ where }: { where: Where }) =>
      Promise.resolve(
        rows
          .filter((row) =>
            where.validFrom instanceof Date
              ? t(row.validFrom) === t(where.validFrom)
              : containsAt(row, where),
          )
          .map((row) => ({ ...row })),
      ),
    // Closes rows by primary key: `OR` of exact (typeId, validFrom) pairs.
    updateMany: ({
      where,
      data,
    }: {
      where: { OR: { typeId: number; validFrom: Date }[] };
      data: { validUntil: Date };
    }) => {
      for (const row of rows) {
        if (
          where.OR.some(
            (key) =>
              key.typeId === row.typeId &&
              t(key.validFrom) === t(row.validFrom),
          )
        ) {
          row.validUntil = data.validUntil;
        }
      }
      return Promise.resolve({ count: 0 });
    },
    deleteMany: ({
      where,
    }: {
      where: { typeId: { in: number[] }; validFrom: Date };
    }) => {
      rows = rows.filter(
        (row) =>
          !(
            where.typeId.in.includes(row.typeId) &&
            t(row.validFrom) === t(where.validFrom)
          ),
      );
      return Promise.resolve({ count: 0 });
    },
    createMany: ({ data }: { data: InsurancePriceRow[] }) => {
      for (const row of data) {
        if (
          rows.some(
            (r) =>
              r.typeId === row.typeId && t(r.validFrom) === t(row.validFrom),
          )
        ) {
          throw new Error(`Duplicate key ${row.typeId} ${t(row.validFrom)}`);
        }
        rows.push({ ...row });
      }
      return Promise.resolve({ count: data.length });
    },
  },
};
/** Write conflicts to raise before the next transactions run. */
let conflicts = 0;
const transaction = jest.fn((fn: (client: typeof tx) => Promise<unknown>) => {
  if (conflicts > 0) {
    conflicts--;
    return Promise.reject(
      Object.assign(new Error("write conflict"), { code: "P2034" }),
    );
  }
  return fn(tx);
});
jest.mock("../db", () => ({
  prisma: {
    $transaction: (fn: (client: typeof tx) => Promise<unknown>) =>
      transaction(fn),
  },
}));

let recordInsurancePriceSnapshot: typeof Record_;
beforeAll(async () => {
  ({ recordInsurancePriceSnapshot } =
    await import("../helpers/recordInsurancePriceSnapshot.ts"));
});
beforeEach(() => {
  snapshots = [];
  rows = [];
  conflicts = 0;
});

const at = (hour: number) => new Date(Date.UTC(2026, 9, 10, hour));
const prices = (value: number): InsurancePriceValues => ({
  basicCost: value * 0.1,
  basicPayout: value,
  standardCost: value * 0.2,
  standardPayout: value * 1.2,
  bronzeCost: value * 0.3,
  bronzePayout: value * 1.4,
  silverCost: value * 0.4,
  silverPayout: value * 1.6,
  goldCost: value * 0.5,
  goldPayout: value * 1.8,
  platinumCost: value * 0.6,
  platinumPayout: value * 2,
});

/** Hour → { typeId: value }; a type missing from an hour is unlisted then. */
const observations: Record<number, Record<number, number>> = {
  0: { 1: 100, 2: 200 },
  1: { 1: 100, 2: 200 },
  2: { 1: 110, 2: 200 },
  3: { 1: 110, 2: 200, 3: 50 },
  4: { 1: 120, 3: 50 },
  5: { 1: 110, 3: 50 },
  6: { 1: 110, 2: 210, 3: 50 },
  7: { 1: 110, 2: 210 },
  8: { 1: 100, 2: 210, 3: 50 },
};

const record = (hour: number) =>
  recordInsurancePriceSnapshot({
    observedAt: at(hour),
    source: "everef",
    prices: new Map(
      Object.entries(observations[hour] ?? {}).map(([id, value]) => [
        Number(id),
        prices(value),
      ]),
    ),
  });

const table = () =>
  rows
    .map((row) => ({
      typeId: row.typeId,
      from: row.validFrom.getUTCHours(),
      until: row.validUntil?.getUTCHours() ?? null,
      value: row.basicPayout,
    }))
    .sort((a, b) => a.typeId - b.typeId || a.from - b.from);

/** Deterministic shuffles, so a failure reproduces. */
function* orders(): Generator<number[]> {
  const hours = Object.keys(observations).map(Number);
  yield [...hours].reverse();
  let seed = 42;
  for (let i = 0; i < 30; i++) {
    const pool = [...hours];
    const shuffled: number[] = [];
    while (pool.length > 0) {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      shuffled.push(...pool.splice(seed % pool.length, 1));
    }
    yield shuffled;
  }
}

describe("recordInsurancePriceSnapshot", () => {
  it("keeps one row per stretch of unchanged prices", async () => {
    for (const hour of Object.keys(observations).map(Number)) {
      await record(hour);
    }
    expect(table()).toEqual([
      { typeId: 1, from: 0, until: 2, value: 100 },
      { typeId: 1, from: 2, until: 4, value: 110 },
      { typeId: 1, from: 4, until: 5, value: 120 },
      { typeId: 1, from: 5, until: 8, value: 110 },
      { typeId: 1, from: 8, until: null, value: 100 },
      { typeId: 2, from: 0, until: 4, value: 200 },
      { typeId: 2, from: 6, until: null, value: 210 },
      { typeId: 3, from: 3, until: 7, value: 50 },
      { typeId: 3, from: 8, until: null, value: 50 },
    ]);
    expect(snapshots).toHaveLength(9);
  });

  it("ends with the same table whatever order observations arrive in", async () => {
    for (const hour of Object.keys(observations).map(Number)) {
      await record(hour);
    }
    const expected = table();
    for (const order of orders()) {
      snapshots = [];
      rows = [];
      for (const hour of order) await record(hour);
      expect({ order, table: table() }).toEqual({ order, table: expected });
    }
  });

  it("ignores an observation already recorded", async () => {
    await record(0);
    await expect(record(0)).resolves.toEqual({
      recorded: false,
      changedTypes: 0,
      snapshots: 0,
    });
    expect(snapshots).toHaveLength(1);
  });

  it("records repeats of the same list as snapshots only", async () => {
    await record(8);
    const result = await recordInsurancePriceSnapshot({
      observedAt: at(0),
      source: "everef",
      prices: new Map([[1, prices(100)]]),
      repeatedAt: [at(1), at(2)],
    });
    expect(result).toEqual({ recorded: true, changedTypes: 1, snapshots: 3 });
    expect(table().filter((row) => row.typeId === 1)).toEqual([
      { typeId: 1, from: 0, until: null, value: 100 },
    ]);
  });

  it("refuses repeats past the next recorded observation", async () => {
    await record(2);
    await expect(
      recordInsurancePriceSnapshot({
        observedAt: at(0),
        source: "everef",
        prices: new Map([[1, prices(100)]]),
        repeatedAt: [at(3)],
      }),
    ).rejects.toThrow(/between this one and the next/);
  });

  it("retries a transaction CockroachDB aborts as a write conflict", async () => {
    conflicts = 2;
    await expect(record(0)).resolves.toMatchObject({ recorded: true });
    expect(transaction).toHaveBeenCalledTimes(3);
  });

  it("gives up after three write conflicts", async () => {
    conflicts = 3;
    await expect(record(0)).rejects.toThrow("write conflict");
    expect(snapshots).toHaveLength(0);
  });
});
