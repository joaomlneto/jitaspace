/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type * as RouteModule from "../app/api/system/[systemId]/cost-indices/route";
import type {
  CostIndexHistory,
  CostIndexRange,
  CostIndicesAt,
} from "~/app/system/[systemId]/costIndices";
import { buildCostIndexChartRows } from "~/app/system/[systemId]/costIndices";

const mockReadHistory =
  jest.fn<(id: number, range: CostIndexRange) => Promise<CostIndexHistory>>();
const mockReadAt = jest.fn<(id: number, at: Date) => Promise<CostIndicesAt>>();
jest.mock("~/app/system/[systemId]/costIndexData", () => ({
  readSolarSystemCostIndexHistory: (id: number, range: CostIndexRange) =>
    mockReadHistory(id, range),
  readSolarSystemCostIndicesAt: (id: number, at: Date) => mockReadAt(id, at),
}));

const loadGET = () =>
  (
    require("../app/api/system/[systemId]/cost-indices/route") as typeof RouteModule
  ).GET;

const get = (systemId: string, query = "") =>
  loadGET()(
    new Request(
      `https://www.jita.space/api/system/${systemId}/cost-indices${query}`,
    ),
    { params: Promise.resolve({ systemId }) },
  );

const v = (manufacturing: number | null) => [
  manufacturing,
  0.01,
  0.01,
  0.01,
  0.01,
  0.01,
];

const history = (
  overrides: Partial<CostIndexHistory> = {},
): CostIndexHistory => ({
  range: "30d",
  resolution: "change",
  firstSnapshotAt: 0,
  latestSnapshotAt: 100,
  from: 10,
  points: [],
  gaps: [],
  ...overrides,
});

beforeEach(() => {
  mockReadHistory.mockReset();
  mockReadAt.mockReset();
});

describe("GET /api/system/[systemId]/cost-indices", () => {
  it("serves 30 days by default, cached at the CDN", async () => {
    mockReadHistory.mockResolvedValue(history());
    const res = await get("30000142");
    expect(res.status).toBe(200);
    expect(mockReadHistory).toHaveBeenCalledWith(30000142, "30d");
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=3600");
    expect(await res.json()).toEqual(history());
  });

  it("serves the range asked for", async () => {
    mockReadHistory.mockResolvedValue(history({ range: "all" }));
    await get("30000142", "?range=all");
    expect(mockReadHistory).toHaveBeenCalledWith(30000142, "all");
  });

  it.each([
    ["a bad id", "abc", ""],
    ["an unknown range", "30000142", "?range=2w"],
    ["a bad time", "30000142", "?at=yesterday"],
  ])("rejects %s", async (_, id, query) => {
    const res = await get(id, query);
    expect(res.status).toBe(400);
    expect(mockReadHistory).not.toHaveBeenCalled();
    expect(mockReadAt).not.toHaveBeenCalled();
  });

  it("answers for a moment, caching a settled answer longer", async () => {
    const answer: CostIndicesAt = {
      at: Date.parse("2024-01-01T00:00:00Z"),
      values: v(0.05),
      since: 1,
      observedAt: 2,
      nextObservedAt: 3,
      inGap: false,
    };
    mockReadAt.mockResolvedValue(answer);
    const res = await get("30000142", "?at=2024-01-01T00:00:00Z");
    expect(mockReadAt).toHaveBeenCalledWith(
      30000142,
      new Date("2024-01-01T00:00:00Z"),
    );
    expect(await res.json()).toEqual(answer);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=86400");

    mockReadAt.mockResolvedValue({ ...answer, nextObservedAt: null });
    const latest = await get("30000142", "?at=2024-01-01T00:00:00Z");
    expect(latest.headers.get("Cache-Control")).toContain("s-maxage=3600");
  });

  it("lets a database failure through as a 500", async () => {
    mockReadHistory.mockRejectedValue(new Error("db down"));
    await expect(get("30000142")).rejects.toThrow("db down");
  });
});

describe("buildCostIndexChartRows", () => {
  it("steps through each change and runs to the latest snapshot", () => {
    const rows = buildCostIndexChartRows(
      history({
        points: [
          { time: 10, values: v(0.1) },
          { time: 50, values: v(0.2) },
        ],
      }),
    );
    expect(rows.map((row) => [row.time, row.manufacturing])).toEqual([
      [10, 0.1],
      [50, 0.2],
      [100, 0.2],
    ]);
    expect(rows[0]).toMatchObject({ copying: 0.01, reaction: 0.01 });
  });

  it("breaks the lines over a gap and resumes with the carried values", () => {
    const rows = buildCostIndexChartRows(
      history({
        points: [
          { time: 10, values: v(0.1) },
          { time: 80, values: v(0.3) },
        ],
        gaps: [{ from: 30, to: 60 }],
      }),
    );
    expect(rows.map((row) => [row.time, row.manufacturing])).toEqual([
      [10, 0.1],
      [30, 0.1],
      [31, null],
      [60, 0.1],
      [80, 0.3],
      [100, 0.3],
    ]);
    expect(rows[2]?.reaction).toBeNull();
  });

  it("breaks after a change recorded by the snapshots either side of a gap", () => {
    const rows = buildCostIndexChartRows(
      history({
        points: [
          { time: 10, values: v(0.1) },
          { time: 30, values: v(0.2) },
          { time: 60, values: v(0.3) },
        ],
        gaps: [{ from: 30, to: 60 }],
      }),
    );
    expect(rows.map((row) => [row.time, row.manufacturing])).toEqual([
      [10, 0.1],
      [30, 0.2],
      [31, null],
      [60, 0.3],
      [100, 0.3],
    ]);
  });

  it("ignores a gap ending before the range", () => {
    const rows = buildCostIndexChartRows(
      history({
        points: [{ time: 10, values: v(0.1) }],
        gaps: [{ from: 2, to: 5 }],
      }),
    );
    expect(rows.map((row) => row.time)).toEqual([10, 100]);
  });

  it("draws nothing for a system with no record", () => {
    expect(buildCostIndexChartRows(history())).toEqual([]);
  });

  it("does not repeat the last point when it is the latest snapshot", () => {
    const rows = buildCostIndexChartRows(
      history({ points: [{ time: 100, values: v(0.1) }] }),
    );
    expect(rows).toHaveLength(1);
  });
});
