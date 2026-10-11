import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import type { SovereigntyPeriod } from "../helpers/sovereigntyHistory";
import type * as Store from "../helpers/sovereigntyHistoryStore";
import { SovereigntyHistory } from "../helpers/sovereigntyHistory";

// @swc/jest doesn't hoist jest.mock, so the mock fns are declared first and the
// factories close over them; the module is imported lazily in beforeAll.
type Row = Record<string, unknown>;
const periodFindMany = jest.fn<(a?: unknown) => Promise<SovereigntyPeriod[]>>();
const periodDeleteMany = jest.fn((_a: unknown) =>
  Promise.resolve({ count: 0 }),
);
const periodCreateMany = jest.fn((_a: unknown) =>
  Promise.resolve({ count: 0 }),
);
const snapshotFindFirst = jest.fn<(a?: unknown) => Promise<Row | null>>();
const snapshotCreateMany = jest.fn((_a: unknown) =>
  Promise.resolve({ count: 0 }),
);
const tx = {
  solarSystemSovereigntyPeriod: {
    findMany: (a?: unknown) => periodFindMany(a),
    deleteMany: (a: unknown) => periodDeleteMany(a),
    createMany: (a: unknown) => periodCreateMany(a),
  },
  sovereigntySnapshot: {
    findFirst: (a?: unknown) => snapshotFindFirst(a),
    createMany: (a: unknown) => snapshotCreateMany(a),
  },
};
const transactionOptions = jest.fn((_options: unknown) => undefined);
jest.mock("../db", () => ({
  prisma: {
    ...tx,
    $transaction: (
      fn: (client: typeof tx) => Promise<unknown>,
      options?: unknown,
    ) => {
      transactionOptions(options);
      return fn(tx);
    },
  },
}));

let store: typeof Store;

beforeAll(async () => {
  store = await import("../helpers/sovereigntyHistoryStore");
});

const t = (iso: string) => new Date(`${iso}Z`);

const period = (
  solarSystemId: number,
  allianceId: number,
  startedAt: string,
  endedAt: string | null = null,
): SovereigntyPeriod => ({
  solarSystemId,
  isUnclaimed: false,
  allianceId,
  corporationId: allianceId * 10,
  factionId: null,
  claimedSince: null,
  sovereigntyHubId: null,
  startedAt: t(startedAt),
  earliestStartedAt: null,
  endedAt: endedAt === null ? null : t(endedAt),
});

beforeEach(() => {
  jest.clearAllMocks();
  periodFindMany.mockResolvedValue([]);
  snapshotFindFirst.mockResolvedValue(null);
});

describe("loadSovereigntyHistory", () => {
  it("loads the open periods and the newest snapshot", async () => {
    periodFindMany.mockResolvedValue([period(1, 10, "2026-01-01T00:00:00")]);
    snapshotFindFirst.mockResolvedValue({
      observedAt: t("2026-10-10T20:00:00"),
    });

    const history = await store.loadSovereigntyHistory();

    expect(periodFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { endedAt: null } }),
    );
    expect(history.openPeriodCount).toBe(1);
    expect(history.latestSnapshotAt).toEqual(t("2026-10-10T20:00:00"));
  });
});

describe("writeSovereigntyHistory", () => {
  it("rewrites retargeted rows with their new end, alongside the rest", async () => {
    const predecessor = period(
      1,
      10,
      "2019-01-01T00:00:00",
      "2021-07-01T05:00:00",
    );
    periodFindMany.mockResolvedValue([predecessor]);

    const result = await store.writeSovereigntyHistory(tx as never, {
      snapshots: [
        { observedAt: t("2026-10-10T20:00:00"), source: "esi", systemCount: 1 },
      ],
      deletes: [{ solarSystemId: 1, startedAt: t("2021-07-01T05:00:00") }],
      upserts: [period(1, 20, "2020-10-08T00:38:16")],
      retargets: [
        {
          solarSystemId: 1,
          endedAt: t("2021-07-01T05:00:00"),
          newEndedAt: t("2020-10-08T00:38:16"),
        },
      ],
    });

    expect(periodFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ solarSystemId: 1, endedAt: t("2021-07-01T05:00:00") }],
        },
      }),
    );
    expect(periodDeleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { solarSystemId: 1, startedAt: t("2021-07-01T05:00:00") },
          { solarSystemId: 1, startedAt: t("2019-01-01T00:00:00") },
        ],
      },
    });
    expect(periodCreateMany).toHaveBeenCalledWith({
      data: [
        period(1, 20, "2020-10-08T00:38:16"),
        { ...predecessor, endedAt: t("2020-10-08T00:38:16") },
      ],
    });
    expect(snapshotCreateMany).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ snapshots: 1, periodsWritten: 2 });
  });

  it("writes in statements of at most 500 rows", async () => {
    const upserts = Array.from({ length: 1200 }, (_, i) =>
      period(30000000 + i, 10, "2017-11-29T14:48:42"),
    );

    await store.writeSovereigntyHistory(tx as never, {
      snapshots: [],
      deletes: [],
      upserts,
      retargets: [],
    });

    expect(periodDeleteMany).not.toHaveBeenCalled();
    expect(
      periodCreateMany.mock.calls.map(
        ([arg]) => (arg as { data: unknown[] }).data.length,
      ),
    ).toEqual([500, 500, 200]);
  });
});

describe("commitSovereigntyHistory", () => {
  const historyAt = (latest: string | null) => {
    const history = new SovereigntyHistory({
      openPeriods: [],
      latestSnapshotAt: latest === null ? null : t(latest),
    });
    history.apply({
      observedAt: t("2026-10-10T21:00:00"),
      source: "esi",
      systems: new Map([
        [30000001, { ...period(1, 10, "2026-01-01T00:00:00") }],
      ]),
    });
    return history;
  };

  it("writes when the database is where the history started", async () => {
    snapshotFindFirst.mockResolvedValue({
      observedAt: t("2026-10-10T20:00:00"),
    });

    await store.commitSovereigntyHistory(historyAt("2026-10-10T20:00:00"));

    // The cursor check is only sound under SERIALIZABLE on Postgres.
    expect(transactionOptions).toHaveBeenCalledWith(
      expect.objectContaining({ isolationLevel: "Serializable" }),
    );
    expect(periodCreateMany).toHaveBeenCalledTimes(1);
    expect(snapshotCreateMany).toHaveBeenCalledTimes(1);
  });

  it("refuses when another run wrote a newer snapshot in between", async () => {
    snapshotFindFirst.mockResolvedValue({
      observedAt: t("2026-10-10T20:40:00"),
    });

    await expect(
      store.commitSovereigntyHistory(historyAt("2026-10-10T20:00:00")),
    ).rejects.toThrow("moved on");
    expect(periodCreateMany).not.toHaveBeenCalled();
  });
});
