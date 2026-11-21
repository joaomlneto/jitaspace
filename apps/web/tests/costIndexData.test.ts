/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type * as DataModule from "../app/system/[systemId]/costIndexData";

jest.mock("next/cache", () => ({ cacheLife: () => undefined }));

type Row = Record<string, unknown>;
const mockSnapshotFindFirst = jest.fn<(args: Row) => Promise<unknown>>();
const mockIndexFindFirst = jest.fn<(args: Row) => Promise<unknown>>();
const mockIndexFindMany = jest.fn<(args: Row) => Promise<unknown>>();
const mockQueryRaw =
  jest.fn<
    (sql: TemplateStringsArray, ...values: unknown[]) => Promise<Row[]>
  >();
jest.mock("~/lib/db", () => ({
  prisma: {
    solarSystemCostIndexSnapshot: {
      findFirst: (args: Row) => mockSnapshotFindFirst(args),
    },
    solarSystemCostIndex: {
      findFirst: (args: Row) => mockIndexFindFirst(args),
      findMany: (args: Row) => mockIndexFindMany(args),
    },
    $queryRaw: (sql: TemplateStringsArray, ...values: unknown[]) =>
      mockQueryRaw(sql, ...values),
  },
}));

const loadData = () =>
  require("../app/system/[systemId]/costIndexData") as typeof DataModule;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const FIRST = new Date("2017-11-29T07:53:41Z");
const LATEST = new Date("2026-11-04T01:24:54Z");
const JITA = 30000142;

const row = (validFrom: Date, manufacturing: number | null) => ({
  validFrom,
  manufacturing,
  researchingTimeEfficiency: manufacturing === null ? null : 0.0014,
  researchingMaterialEfficiency: manufacturing === null ? null : 0.0014,
  copying: manufacturing === null ? null : 0.0014,
  invention: manufacturing === null ? null : 0.0014,
  reaction: manufacturing === null ? null : 0.0014,
});

const isDaily = (sql: TemplateStringsArray) =>
  sql.join("").includes("DISTINCT ON");

/** The record: first and latest snapshots, its gaps and the daily closes. */
const record = ({
  gaps = [] as { from: Date; to: Date }[],
  daily = [] as Row[],
  empty = false,
} = {}) => {
  mockSnapshotFindFirst.mockImplementation((args) => {
    if (empty) return Promise.resolve(null);
    const { orderBy } = args as { orderBy: { snapshotAt: string } };
    return Promise.resolve({
      snapshotAt: orderBy.snapshotAt === "asc" ? FIRST : LATEST,
    });
  });
  mockQueryRaw.mockImplementation((sql) =>
    Promise.resolve(isDaily(sql) ? daily : gaps),
  );
};

beforeEach(() => {
  mockSnapshotFindFirst.mockReset();
  mockIndexFindFirst.mockReset();
  mockIndexFindMany.mockReset();
  mockQueryRaw.mockReset();
});

describe("readSolarSystemCostIndexHistory", () => {
  it("is empty before anything was recorded", async () => {
    record({ empty: true });
    const history = await loadData().readSolarSystemCostIndexHistory(
      JITA,
      "30d",
    );
    expect(history).toEqual({
      range: "30d",
      resolution: "change",
      firstSnapshotAt: null,
      latestSnapshotAt: null,
      from: null,
      points: [],
      gaps: [],
    });
    expect(mockIndexFindMany).not.toHaveBeenCalled();
  });

  it("pins what was in force at the range's start, then every change", async () => {
    record();
    const from = new Date(LATEST.getTime() - 30 * DAY);
    mockIndexFindFirst.mockResolvedValue(
      row(new Date("2026-09-01T00:00:00Z"), 0.16),
    );
    mockIndexFindMany.mockResolvedValue([
      row(new Date(LATEST.getTime() - 5 * DAY), 0.17),
    ]);

    const history = await loadData().readSolarSystemCostIndexHistory(
      JITA,
      "30d",
    );

    expect(history.from).toBe(from.getTime());
    expect(history.firstSnapshotAt).toBe(FIRST.getTime());
    expect(history.points).toEqual([
      {
        time: from.getTime(),
        values: [0.16, 0.0014, 0.0014, 0.0014, 0.0014, 0.0014],
      },
      {
        time: LATEST.getTime() - 5 * DAY,
        values: [0.17, 0.0014, 0.0014, 0.0014, 0.0014, 0.0014],
      },
    ]);
    expect(mockIndexFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { solarSystemId: JITA, validFrom: { lte: from } },
      }),
    );
    expect(mockIndexFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { solarSystemId: JITA, validFrom: { gt: from } },
      }),
    );
  });

  it("opens a range that starts inside a gap where the gap ends", async () => {
    const gapEnd = new Date(LATEST.getTime() - 3 * DAY);
    record({
      gaps: [
        {
          from: new Date("2019-01-09T10:15:03Z"),
          to: new Date("2021-07-01T05:45:03Z"),
        },
        { from: new Date(LATEST.getTime() - 10 * DAY), to: gapEnd },
      ],
    });
    mockIndexFindFirst.mockResolvedValue(
      row(new Date("2026-09-01T00:00:00Z"), 0.16),
    );
    mockIndexFindMany.mockResolvedValue([]);

    const history = await loadData().readSolarSystemCostIndexHistory(
      JITA,
      "7d",
    );

    expect(history.points[0]?.time).toBe(gapEnd.getTime());
    // Only the gap overlapping the range.
    expect(history.gaps).toEqual([
      { from: LATEST.getTime() - 10 * DAY, to: gapEnd.getTime() },
    ]);
  });

  it("reads one close per day for the whole history", async () => {
    record({
      daily: [row(FIRST, 0.11), row(new Date("2017-11-30T23:00:00Z"), 0.12)],
    });

    const history = await loadData().readSolarSystemCostIndexHistory(
      JITA,
      "all",
    );

    expect(history.resolution).toBe("day");
    expect(history.from).toBeNull();
    expect(history.points.map((point) => point.values[0])).toEqual([
      0.11, 0.12,
    ]);
    expect(mockIndexFindFirst).not.toHaveBeenCalled();
    expect(mockIndexFindMany).not.toHaveBeenCalled();
    const daily = mockQueryRaw.mock.calls.find(([sql]) => isDaily(sql));
    expect(daily?.slice(1)).toEqual([JITA, new Date(0)]);
  });

  it("lets a database failure through", async () => {
    record();
    mockQueryRaw.mockRejectedValue(new Error("db down"));
    await expect(
      loadData().readSolarSystemCostIndexHistory(JITA, "30d"),
    ).rejects.toThrow("db down");
  });
});

describe("readSolarSystemCostIndicesAt", () => {
  const at = new Date("2023-07-04T12:00:00Z");
  const snapshots = (observed: Date | null, next: Date | null) =>
    mockSnapshotFindFirst.mockImplementation((args) => {
      const { where } = args as { where: { snapshotAt: Row } };
      const value = "lte" in where.snapshotAt ? observed : next;
      return Promise.resolve(value && { snapshotAt: value });
    });

  it("answers with the latest change, vouched for by the snapshots around it", async () => {
    mockIndexFindFirst.mockResolvedValue(
      row(new Date("2023-07-04T10:42:01Z"), 0.2326),
    );
    snapshots(
      new Date(at.getTime() - 0.5 * HOUR),
      new Date(at.getTime() + 0.5 * HOUR),
    );

    const answer = await loadData().readSolarSystemCostIndicesAt(JITA, at);

    expect(answer).toEqual({
      at: at.getTime(),
      values: [0.2326, 0.0014, 0.0014, 0.0014, 0.0014, 0.0014],
      since: Date.parse("2023-07-04T10:42:01Z"),
      observedAt: at.getTime() - 0.5 * HOUR,
      nextObservedAt: at.getTime() + 0.5 * HOUR,
      inGap: false,
    });
  });

  it("flags a moment between snapshots far apart as a gap", async () => {
    mockIndexFindFirst.mockResolvedValue(
      row(new Date("2019-01-09T10:15:03Z"), 0.11),
    );
    snapshots(
      new Date("2019-01-09T10:15:03Z"),
      new Date("2021-07-01T05:45:03Z"),
    );
    const answer = await loadData().readSolarSystemCostIndicesAt(JITA, at);
    expect(answer.inGap).toBe(true);
  });

  it("flags a moment long after the latest snapshot as a gap", async () => {
    mockIndexFindFirst.mockResolvedValue(row(LATEST, 0.17));
    snapshots(LATEST, null);
    const later = new Date(LATEST.getTime() + 5 * HOUR);
    expect(
      (await loadData().readSolarSystemCostIndicesAt(JITA, later)).inGap,
    ).toBe(true);
    const soon = new Date(LATEST.getTime() + HOUR);
    expect(
      (await loadData().readSolarSystemCostIndicesAt(JITA, soon)).inGap,
    ).toBe(false);
  });

  it("has no values before the record, or once a system stopped being listed", async () => {
    mockIndexFindFirst.mockResolvedValue(null);
    snapshots(null, FIRST);
    const before = await loadData().readSolarSystemCostIndicesAt(
      JITA,
      new Date(0),
    );
    expect(before).toMatchObject({ values: null, since: null, inGap: true });

    mockIndexFindFirst.mockResolvedValue(
      row(new Date("2023-07-01T00:00:00Z"), null),
    );
    snapshots(new Date(at.getTime() - HOUR), new Date(at.getTime() + HOUR));
    const unlisted = await loadData().readSolarSystemCostIndicesAt(JITA, at);
    expect(unlisted.values).toBeNull();
    expect(unlisted.since).toBe(Date.parse("2023-07-01T00:00:00Z"));
  });
});
