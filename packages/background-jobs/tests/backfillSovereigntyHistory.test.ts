import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import type { JobLogger } from "../core";
import type {
  SovereigntyHistory as History,
  SovereigntyObservation,
} from "../helpers/sovereigntyHistory";
import type { backfillEveRefSovereigntyHistory as Backfill } from "../jobs/scrape/everef/backfillSovereigntyHistory";
import { SovereigntyHistory } from "../helpers/sovereigntyHistory";

// @swc/jest doesn't hoist jest.mock, so the mock fns are declared first and the
// factories close over them; the module is imported lazily in beforeAll. EVE
// Ref and the database are stubbed; SovereigntyHistory runs for real.
let history: History;
const commits: ReturnType<History["flush"]>[] = [];
jest.mock("../helpers/sovereigntyHistoryStore.ts", () => ({
  loadSovereigntyHistory: () => Promise.resolve(history),
  commitSovereigntyHistory: (h: History) => {
    commits.push(h.flush());
    return Promise.resolve({});
  },
}));

const t = (iso: string) => new Date(`${iso}Z`);
const observation = (iso: string, allianceId = 1): SovereigntyObservation => ({
  observedAt: t(iso),
  source: "everef",
  systems: new Map([
    [
      30000001,
      {
        isUnclaimed: false,
        allianceId,
        corporationId: allianceId * 10,
        factionId: null,
        claimedSince: null,
        sovereigntyHubId: null,
      },
    ],
  ]),
});

const hours = (start: string, count: number) =>
  Array.from({ length: count }, (_, i) =>
    observation(new Date(+t(start) + i * 3_600_000).toISOString().slice(0, 19)),
  );

let archiveObservations: SovereigntyObservation[];
let dayFiles: { observedAt: Date; url: string }[];
jest.mock("../helpers/everefSovereignty.ts", () => ({
  listEveRefSovereigntyArchive: () =>
    Promise.resolve([
      { kind: "archive", year: 2017, url: "https://e.test/2017.tar.bz2" },
      {
        kind: "day",
        day: t("2026-10-09T00:00:00"),
        indexUrl: "https://e.test/d1",
      },
      {
        kind: "day",
        day: t("2026-10-10T00:00:00"),
        indexUrl: "https://e.test/d2",
      },
    ]),
  readEveRefYearArchive: () =>
    Promise.resolve({
      count: archiveObservations.length,
      errors: 2,
      observations: archiveObservations,
    }),
  listEveRefDay: (day: { indexUrl: string }) =>
    Promise.resolve(day.indexUrl === "https://e.test/d1" ? dayFiles : []),
  fetchEveRefSnapshot: (file: { observedAt: Date; url: string }) => {
    return Promise.resolve(
      file.url === "error"
        ? null
        : observation(file.observedAt.toISOString().slice(0, 19)),
    );
  },
}));

jest.mock("../db", () => ({ prisma: {} }));

let backfill: typeof Backfill;

beforeAll(async () => {
  ({ backfillEveRefSovereigntyHistory: backfill } =
    await import("../jobs/scrape/everef/backfillSovereigntyHistory"));
});

const logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} satisfies JobLogger;
const send = jest.fn((_id: string, _payload: unknown) => Promise.resolve());

interface Result {
  applied: number;
  archivedErrors: number;
  commits: number;
  finished: boolean;
  reached: string | null;
}
const run = async (payload: Record<string, unknown> = {}) =>
  (await backfill.handler({ payload, logger, send } as never)) as Result;

beforeEach(() => {
  jest.clearAllMocks();
  commits.length = 0;
  history = new SovereigntyHistory({ openPeriods: [], latestSnapshotAt: null });
  archiveObservations = hours("2017-11-29T14:00:00", 1200);
  dayFiles = [
    { observedAt: t("2026-10-09T00:40:00"), url: "a" },
    { observedAt: t("2026-10-09T01:40:00"), url: "error" },
    { observedAt: t("2026-10-09T02:40:00"), url: "b" },
  ];
});

describe("backfill-everef-sovereignty-history", () => {
  it("replays the archives, then the daily files, committing as it goes", async () => {
    const result = await run();

    expect(result).toMatchObject({
      applied: 1202,
      archivedErrors: 3,
      finished: true,
      reached: "2026-10-09T02:40:00.000Z",
    });
    // 500 + 500 + the archive's tail, then one per day with something in it.
    expect(commits.map((c) => c.snapshots.length)).toEqual([500, 500, 200, 2]);
    expect(send).not.toHaveBeenCalled();
  });

  it("stops at `until`", async () => {
    const result = await run({ until: "2017-11-29T16:00:00Z" });

    expect(result).toMatchObject({
      applied: 3,
      reached: "2017-11-29T16:00:00.000Z",
    });
  });

  it("saves its progress and triggers itself when its time budget runs out", async () => {
    // A budget already spent: it stops before the first part.
    const result = await run({ budgetMinutes: -1 });

    expect(result).toMatchObject({ applied: 0, finished: false });
    expect(send).toHaveBeenCalledWith("backfill-everef-sovereignty-history", {
      budgetMinutes: -1,
    });
  });
});
