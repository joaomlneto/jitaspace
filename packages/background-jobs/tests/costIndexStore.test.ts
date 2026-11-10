import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type { Db } from "@jitaspace/db";

import type { CostIndexSnapshotWrite } from "../helpers/costIndexStore";
import type { SolarSystemCostIndexRow } from "../helpers/industryCostIndices";
import {
  appendCostIndexSnapshots,
  CostIndexSnapshotOrderError,
  loadCostIndexState,
} from "../helpers/costIndexStore";

let latest: { snapshotAt: Date } | null;
const createRows = jest.fn((_args: { data: unknown[] }) =>
  Promise.resolve({ count: 0 }),
);
const createSnapshots = jest.fn((_args: { data: unknown[] }) =>
  Promise.resolve({ count: 0 }),
);
const queryRaw = jest.fn((_query: unknown) =>
  Promise.resolve([] as Record<string, unknown>[]),
);
const tx = {
  solarSystemCostIndexSnapshot: {
    findFirst: () => Promise.resolve(latest),
    createMany: (args: { data: unknown[] }) => createSnapshots(args),
  },
  solarSystemCostIndex: {
    createMany: (args: { data: unknown[] }) => createRows(args),
  },
};
const prisma = {
  $transaction: (fn: (client: typeof tx) => Promise<unknown>) => fn(tx),
  $queryRaw: (query: unknown) => queryRaw(query),
} as unknown as Db;

const at = (h: number) => new Date(Date.UTC(2026, 9, 10, h));
const row = (solarSystemId: number, h: number): SolarSystemCostIndexRow => ({
  solarSystemId,
  validFrom: at(h),
  manufacturing: 0.1,
  researchingTimeEfficiency: null,
  researchingMaterialEfficiency: null,
  copying: null,
  invention: null,
  reaction: null,
});
const snapshot = (h: number, rows: SolarSystemCostIndexRow[] = []) =>
  ({
    snapshotAt: at(h),
    source: "everef",
    sourceFile: `/f/${h}`,
    systemCount: 5485,
    rows,
  }) satisfies CostIndexSnapshotWrite;

beforeEach(() => {
  latest = { snapshotAt: at(1) };
});

describe("appendCostIndexSnapshots", () => {
  it("writes the rows and chains each snapshot to the one before", async () => {
    await appendCostIndexSnapshots(
      prisma,
      [snapshot(2, [row(1, 2), row(2, 2)]), snapshot(3, [row(1, 3)])],
      at(1),
    );
    expect(createRows.mock.calls[0]?.[0].data).toHaveLength(3);
    expect(createSnapshots.mock.calls[0]?.[0].data).toEqual([
      expect.objectContaining({
        snapshotAt: at(2),
        previousSnapshotAt: at(1),
        changedSystemCount: 2,
      }),
      expect.objectContaining({
        snapshotAt: at(3),
        previousSnapshotAt: at(2),
        changedSystemCount: 1,
      }),
    ]);
  });

  it("starts the record with no previous snapshot", async () => {
    latest = null;
    await appendCostIndexSnapshots(prisma, [snapshot(2)], null);
    expect(createSnapshots.mock.calls[0]?.[0].data).toEqual([
      expect.objectContaining({ previousSnapshotAt: null }),
    ]);
  });

  it("refuses snapshots out of order", async () => {
    await expect(
      appendCostIndexSnapshots(prisma, [snapshot(3), snapshot(2)], at(1)),
    ).rejects.toThrow(CostIndexSnapshotOrderError);
    expect(createRows).not.toHaveBeenCalled();
  });

  it("refuses when another writer appended since the state was loaded", async () => {
    latest = { snapshotAt: at(2) };
    await expect(
      appendCostIndexSnapshots(prisma, [snapshot(3)], at(1)),
    ).rejects.toThrow(CostIndexSnapshotOrderError);
    expect(createSnapshots).not.toHaveBeenCalled();
  });

  it("writes nothing for no snapshots", async () => {
    await appendCostIndexSnapshots(prisma, [], at(1));
    expect(createSnapshots).not.toHaveBeenCalled();
  });
});

describe("loadCostIndexState", () => {
  it("keeps systems still listed, in batches of 500", async () => {
    queryRaw
      .mockResolvedValueOnce([
        { ...row(1, 1), solarSystemId: 1 },
        {
          ...row(2, 1),
          manufacturing: null,
        },
      ])
      .mockResolvedValueOnce([]);
    const ids = Array.from({ length: 600 }, (_, i) => i + 1);
    const state = await loadCostIndexState(prisma, [...ids, 1]);
    expect(queryRaw).toHaveBeenCalledTimes(2);
    // System 2's latest row is all null: it is no longer listed.
    expect([...state.keys()]).toEqual([1]);
    expect(state.get(1)).toEqual([0.1, null, null, null, null, null]);
  });
});
