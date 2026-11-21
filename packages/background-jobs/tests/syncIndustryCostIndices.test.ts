import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import type { JobLogger } from "../core";
import type { CostIndexSnapshotWrite } from "../helpers/costIndexStore";
import type { EveRefSnapshotFile } from "../helpers/everefIndustrySystems";
import type {
  CostIndexState,
  IndustrySystemsResponse,
} from "../helpers/industryCostIndices";
import type { syncIndustryCostIndices as SyncIndustryCostIndices } from "../jobs/scrape/esi/syncIndustryCostIndices";

// @swc/jest doesn't hoist jest.mock, so the mock fns are declared first and the
// factories close over them; the module is imported lazily in beforeAll. ESI,
// EVE Ref and the database are stubbed; the diffing runs for real.
let esiResponse: IndustrySystemsResponse;
let esiHeaders: Record<string, string>;
const getIndustrySystems = jest.fn(() =>
  Promise.resolve({ data: esiResponse, headers: esiHeaders }),
);
jest.mock("@jitaspace/esi-client", () => ({
  getIndustrySystems: () => getIndustrySystems(),
}));

jest.mock("../db", () => ({
  prisma: {
    solarSystem: {
      findMany: () => Promise.resolve([{ solarSystemId: 1 }]),
    },
  },
}));

let latest: { snapshotAt: Date } | null;
let storedState: CostIndexState;
const loadCostIndexState = jest.fn((_p: unknown, _ids: Iterable<number>) =>
  Promise.resolve(new Map(storedState)),
);
const appendCostIndexSnapshots = jest.fn(
  (
    _p: unknown,
    _snapshots: readonly CostIndexSnapshotWrite[],
    _expected: Date | null,
  ) => Promise.resolve(),
);
jest.mock("../helpers/costIndexStore.ts", () => ({
  loadLatestCostIndexSnapshot: () => Promise.resolve(latest),
  loadCostIndexState: (p: unknown, ids: Iterable<number>) =>
    loadCostIndexState(p, ids),
  appendCostIndexSnapshots: (
    p: unknown,
    snapshots: readonly CostIndexSnapshotWrite[],
    expected: Date | null,
  ) => appendCostIndexSnapshots(p, snapshots, expected),
}));

let archive: (EveRefSnapshotFile & {
  response: IndustrySystemsResponse | null | Error;
})[];
const listEveRefSnapshotsBetween = jest.fn(
  ({ after, until, limit }: { after: Date; until: Date; limit: number }) =>
    Promise.resolve(
      archive
        .filter((file) => file.time > after && file.time <= until)
        .slice(0, limit),
    ),
);
jest.mock("../helpers/everefIndustrySystems.ts", () => ({
  listEveRefSnapshotsBetween: (args: {
    after: Date;
    until: Date;
    limit: number;
  }) => listEveRefSnapshotsBetween(args),
  fetchEveRefSnapshot: (path: string) => {
    const file = archive.find((entry) => entry.path === path);
    if (file?.response instanceof Error) return Promise.reject(file.response);
    return Promise.resolve(file?.response ?? null);
  },
}));

let syncIndustryCostIndices: typeof SyncIndustryCostIndices;

beforeAll(async () => {
  ({ syncIndustryCostIndices } =
    await import("../jobs/scrape/esi/syncIndustryCostIndices"));
});

const logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} satisfies JobLogger;

const run = () =>
  syncIndustryCostIndices.handler({ payload: {}, logger } as never) as Promise<{
    stats: Record<string, number>;
  }>;

const response = (manufacturing: number): IndustrySystemsResponse => [
  {
    solar_system_id: 1,
    cost_indices: [{ activity: "manufacturing", cost_index: manufacturing }],
  },
  {
    solar_system_id: 2,
    cost_indices: [{ activity: "manufacturing", cost_index: 0.5 }],
  },
];

const state = (manufacturing: number): CostIndexState =>
  new Map([
    [1, [manufacturing, null, null, null, null, null]],
    [2, [0.5, null, null, null, null, null]],
  ]);

const hour = (h: number) => new Date(Date.UTC(2026, 9, 10, h, 46, 6));
const archived = (h: number, manufacturing: number) => ({
  path: `/industry-systems/history/${h}`,
  time: new Date(hour(h).getTime() - 4 * 60 * 1000),
  response: response(manufacturing) as IndustrySystemsResponse | null | Error,
});

const appended = () =>
  appendCostIndexSnapshots.mock.calls.map(([, snapshots, expected]) => ({
    expected: expected?.toISOString(),
    snapshots: snapshots.map((snapshot) => ({
      at: snapshot.snapshotAt.toISOString(),
      source: snapshot.source,
      changes: snapshot.rows.map((row) => [
        row.solarSystemId,
        row.manufacturing,
      ]),
    })),
  }));

beforeEach(() => {
  latest = { snapshotAt: hour(18) };
  storedState = state(0.1);
  esiResponse = response(0.2);
  esiHeaders = { "last-modified": hour(19).toUTCString() };
  archive = [];
});

describe("syncIndustryCostIndices", () => {
  it("does nothing before the bootstrap has written any history", async () => {
    latest = null;
    expect(await run()).toEqual({ stats: { skipped: 1 } });
    expect(getIndustrySystems).not.toHaveBeenCalled();
    expect(appendCostIndexSnapshots).not.toHaveBeenCalled();
  });

  it("skips a response it already holds, without loading the state", async () => {
    latest = { snapshotAt: hour(19) };
    expect(await run()).toEqual({ stats: { unchanged: 1 } });
    expect(loadCostIndexState).not.toHaveBeenCalled();
    expect(appendCostIndexSnapshots).not.toHaveBeenCalled();
  });

  it("appends ESI's response, dated by its Last-Modified, with what changed", async () => {
    expect((await run()).stats).toMatchObject({ systems: 2, changed: 1 });
    expect(appended()).toEqual([
      {
        expected: hour(18).toISOString(),
        snapshots: [
          { at: hour(19).toISOString(), source: "esi", changes: [[1, 0.2]] },
        ],
      },
    ]);
    // The state covers every known system and every one ESI listed.
    expect([...(loadCostIndexState.mock.calls[0]?.[1] ?? [])]).toEqual([
      1, 1, 2,
    ]);
  });

  it("replays EVE Ref's archive first when it fell behind", async () => {
    latest = { snapshotAt: hour(15) };
    archive = [archived(16, 0.1), archived(17, 0.15), archived(18, 0.15)];
    expect((await run()).stats).toMatchObject({
      replayed: 3,
      replayedRows: 1,
      changed: 1,
    });
    expect(appended()).toEqual([
      {
        expected: hour(15).toISOString(),
        snapshots: [
          { at: archive[0]?.time.toISOString(), source: "everef", changes: [] },
          {
            at: archive[1]?.time.toISOString(),
            source: "everef",
            changes: [[1, 0.15]],
          },
          { at: archive[2]?.time.toISOString(), source: "everef", changes: [] },
        ],
      },
      {
        expected: archive[2]?.time.toISOString(),
        snapshots: [
          { at: hour(19).toISOString(), source: "esi", changes: [[1, 0.2]] },
        ],
      },
    ]);
  });

  it("leaves ESI's response for the next run while the archive is still behind", async () => {
    latest = { snapshotAt: new Date(Date.UTC(2026, 9, 5)) };
    archive = Array.from({ length: 80 }, (_, i) => ({
      path: `/f/${i}`,
      time: new Date(Date.UTC(2026, 9, 5, i + 1)),
      response: response(0.1),
    }));
    expect((await run()).stats).toMatchObject({ replayed: 72, behind: 1 });
    expect(appendCostIndexSnapshots).toHaveBeenCalledTimes(1);
    expect(appended()[0]?.snapshots).toHaveLength(72);
  });

  it("skips archived files that are not a full response", async () => {
    latest = { snapshotAt: hour(15) };
    archive = [
      { ...archived(16, 0.1), response: null },
      { ...archived(17, 0.1), response: response(0.3).slice(0, 1) },
      archived(18, 0.15),
    ];
    expect((await run()).stats).toMatchObject({ replayed: 1 });
    expect(appended()[0]?.snapshots).toEqual([
      {
        at: archive[2]?.time.toISOString(),
        source: "everef",
        changes: [[1, 0.15]],
      },
    ]);
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });

  it("keeps what EVE Ref gave before failing, then records ESI's values", async () => {
    latest = { snapshotAt: hour(15) };
    archive = [
      archived(16, 0.15),
      { ...archived(17, 0.1), response: new Error("429") },
    ];
    expect((await run()).stats).toMatchObject({ replayed: 1, changed: 1 });
    expect(appended().map((call) => call.snapshots[0]?.source)).toEqual([
      "everef",
      "esi",
    ]);
    expect(logger.warn).toHaveBeenCalledWith(
      "EVE Ref catch-up failed; recording ESI's values and leaving a gap",
      { error: "429" },
    );
  });

  it("refuses a response listing far fewer systems than it holds", async () => {
    esiResponse = response(0.2).slice(0, 1);
    await expect(run()).rejects.toThrow("ESI listed 1 systems, against 2");
    expect(appendCostIndexSnapshots).not.toHaveBeenCalled();
  });

  it("dates a response without Last-Modified by when it was read", async () => {
    esiHeaders = {};
    const before = Date.now();
    await run();
    const at = appendCostIndexSnapshots.mock.calls[0]?.[1][0]?.snapshotAt;
    expect(at?.getTime()).toBeGreaterThanOrEqual(before);
  });
});
