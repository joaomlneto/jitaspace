import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import type { SovereigntySystemsSolarsystem } from "@jitaspace/esi-client";

import type { JobLogger } from "../core";
import type {
  SovereigntyHistory as History,
  SovereigntyObservation,
} from "../helpers/sovereigntyHistory";
import type { trackSovereignty as TrackSovereignty } from "../jobs/scrape/esi/trackSovereignty";
import { SovereigntyHistory } from "../helpers/sovereigntyHistory";

// @swc/jest doesn't hoist jest.mock, so the mock fns are declared first and the
// factories close over them; the module is imported lazily in beforeAll. ESI,
// EVE Ref, the current-holder sync and the database are stubbed; the history
// itself (SovereigntyHistory) runs for real.
let esiSystems: SovereigntySystemsSolarsystem[];
let lastModified: string | undefined;
jest.mock("@jitaspace/esi-client", () => ({
  getSovereigntySystems: () =>
    Promise.resolve({
      data: { solar_systems: esiSystems },
      headers:
        lastModified === undefined ? {} : { "last-modified": lastModified },
    }),
}));

const syncSovereignty = jest.fn((_args: unknown) =>
  Promise.resolve({
    affectedAllianceIds: [] as number[],
    stats: { systems: 0 },
  }),
);
jest.mock("../jobs/scrape/esi/syncSovereignty.ts", () => ({
  syncSovereignty: (args: unknown) => syncSovereignty(args),
}));

let history: History;
const commits: ReturnType<History["flush"]>[] = [];
jest.mock("../helpers/sovereigntyHistoryStore.ts", () => ({
  loadSovereigntyHistory: () => Promise.resolve(history),
  commitSovereigntyHistory: (h: History) => {
    commits.push(h.flush());
    return Promise.resolve({});
  },
}));

interface EveRefFile {
  observedAt: Date;
  url: string;
}
let eveRefFiles: EveRefFile[];
let eveRefError: Error | undefined;
const eveRefSnapshot = (file: EveRefFile, _policy?: unknown) =>
  eveRefError
    ? Promise.reject(eveRefError)
    : Promise.resolve<SovereigntyObservation>({
        observedAt: file.observedAt,
        source: "everef",
        systems: new Map([[30000001, holder(10)]]),
      });
const fetchEveRefSnapshot = jest.fn(eveRefSnapshot);
jest.mock("../helpers/everefSovereignty.ts", () => ({
  listEveRefSovereigntyArchive: () =>
    Promise.resolve([
      { kind: "day", day: new Date(0), indexUrl: "https://example.test/day" },
    ]),
  listEveRefDay: () => Promise.resolve(eveRefFiles),
  fetchEveRefSnapshot: (file: EveRefFile, policy: unknown) =>
    fetchEveRefSnapshot(file, policy),
  QUICK_EVEREF_REQUESTS: { attempts: 2, timeoutMs: 30_000 },
}));

jest.mock("../db", () => ({ prisma: {} }));

let trackSovereignty: typeof TrackSovereignty;

beforeAll(async () => {
  ({ trackSovereignty } = await import("../jobs/scrape/esi/trackSovereignty"));
});

const logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} satisfies JobLogger;
const send = jest.fn((_id: string, _payload: unknown) => Promise.resolve());

interface Stats {
  history: { recorded: boolean; gapFilled: number; catchingUp?: boolean };
  revalidated: number;
}
const run = async () =>
  (
    (await trackSovereignty.handler({
      payload: {},
      logger,
      send,
    } as never)) as { stats: Stats }
  ).stats;

function holder(allianceId: number) {
  return {
    isUnclaimed: false,
    allianceId,
    corporationId: allianceId * 10,
    factionId: null,
    claimedSince: null,
    sovereigntyHubId: null,
  };
}

const ESI_TIME = "2026-10-10T20:43:39Z";

const held = (
  solarSystemId: number,
  allianceId: number,
): SovereigntySystemsSolarsystem => ({
  solar_system_id: solarSystemId,
  claim: {
    alliance: {
      alliance_id: allianceId,
      corporation_id: allianceId * 10,
      claimed_since: "2020-01-01T00:00:00Z",
      is_capital_system: false,
      sovereignty_hub: { id: 1030000000000 },
      development: {
        activity_defense_multiplier: 1,
        military_level: 0,
        industrial_level: 0,
        strategic_level: 0,
      },
    },
  },
});

/** A stored history whose newest snapshot is `minutesBefore` ESI's. */
const historyEnding = (minutesBefore: number | null) =>
  new SovereigntyHistory({
    openPeriods:
      minutesBefore === null
        ? []
        : [
            {
              solarSystemId: 30000001,
              ...holder(10),
              startedAt: new Date("2026-01-01T00:00:00Z"),
              earliestStartedAt: null,
              endedAt: null,
            },
          ],
    latestSnapshotAt:
      minutesBefore === null
        ? null
        : new Date(Date.parse(ESI_TIME) - minutesBefore * 60_000),
  });

const hourlyFiles = (count: number, startMinutesBefore: number) =>
  Array.from({ length: count }, (_, i) => ({
    observedAt: new Date(
      Date.parse(ESI_TIME) - (startMinutesBefore - 60 * i) * 60_000,
    ),
    url: `https://example.test/${i}`,
  }));

beforeEach(() => {
  jest.clearAllMocks();
  fetchEveRefSnapshot.mockImplementation(eveRefSnapshot);
  commits.length = 0;
  esiSystems = [held(30000001, 10), held(31000001, 99)];
  lastModified = "Sat, 10 Oct 2026 20:43:39 GMT";
  eveRefFiles = [];
  eveRefError = undefined;
});

describe("esi-track-sovereignty", () => {
  it("syncs the current holders and evicts the alliances whose systems changed", async () => {
    history = historyEnding(5);
    syncSovereignty.mockResolvedValueOnce({
      affectedAllianceIds: [10, 20],
      stats: { systems: 2 },
    });

    const stats = await run();

    expect(syncSovereignty).toHaveBeenCalledWith(
      expect.objectContaining({ solarSystems: esiSystems }),
    );
    expect(send).toHaveBeenCalledWith("revalidate-alliance-cache", {
      allianceIds: [10, 20],
    });
    expect(stats.revalidated).toBe(2);
  });

  it("records ESI's snapshot at its Last-Modified time, K-space only", async () => {
    history = historyEnding(5);

    const stats = await run();

    expect(stats.history).toMatchObject({ recorded: true, gapFilled: 0 });
    expect(fetchEveRefSnapshot).not.toHaveBeenCalled();
    expect(commits).toHaveLength(1);
    expect(commits[0]?.snapshots).toEqual([
      { observedAt: new Date(ESI_TIME), source: "esi", systemCount: 1 },
    ]);
    // The claim time ESI reports is filled into the open period.
    expect(commits[0]?.upserts[0]?.claimedSince).toEqual(
      new Date("2020-01-01T00:00:00Z"),
    );
  });

  it("records a cached response seen twice only once", async () => {
    history = historyEnding(5);
    await run();
    const stats = await run();

    expect(stats.history.recorded).toBe(false);
    expect(commits).toHaveLength(1);
  });

  it("records nothing before the history has been imported", async () => {
    history = historyEnding(null);

    const stats = await run();

    expect(stats.history.recorded).toBe(false);
    expect(commits).toHaveLength(0);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("backfill-everef-sovereignty-history"),
    );
  });

  it("fills a gap from EVE Ref before recording ESI's snapshot", async () => {
    history = historyEnding(300);
    // Hourly from 4h20 to 1h20 before ESI's. One from before the history's end
    // is not listed, and the first after it is not replayed either: fetched
    // within the hour after our last poll, its data may predate it.
    eveRefFiles = [...hourlyFiles(1, 400), ...hourlyFiles(4, 260)];

    const stats = await run();

    expect(stats.history).toMatchObject({ recorded: true, gapFilled: 3 });
    expect(commits[0]?.snapshots.map((s) => s.source)).toEqual([
      "everef",
      "everef",
      "everef",
      "esi",
    ]);
  });

  it("catches a long gap up over several runs, holding ESI's snapshot back", async () => {
    history = historyEnding(30 * 60);
    eveRefFiles = hourlyFiles(29, 29 * 60);

    const stats = await run();

    expect(stats.history).toMatchObject({
      recorded: false,
      gapFilled: 24,
      catchingUp: true,
    });
    expect(commits[0]?.snapshots.every((s) => s.source === "everef")).toBe(
      true,
    );
  });

  it("fails fast on EVE Ref and stops filling when its time budget runs out", async () => {
    history = historyEnding(5 * 60);
    eveRefFiles = hourlyFiles(4, 4 * 60);
    // Each file takes a minute: the third would start past the 2-minute budget.
    let now = Date.now();
    const clock = jest.spyOn(Date, "now").mockImplementation(() => now);
    fetchEveRefSnapshot.mockImplementation((file) => {
      now += 61_000;
      return Promise.resolve({
        observedAt: file.observedAt,
        source: "everef",
        systems: new Map([[30000001, holder(10)]]),
      });
    });

    try {
      const stats = await run();

      expect(fetchEveRefSnapshot).toHaveBeenCalledTimes(2);
      expect(fetchEveRefSnapshot).toHaveBeenCalledWith(expect.anything(), {
        attempts: 2,
        timeoutMs: 30_000,
      });
      // ESI's snapshot waits for the rest of the gap.
      expect(stats.history).toMatchObject({
        recorded: false,
        gapFilled: 2,
        catchingUp: true,
      });
    } finally {
      clock.mockRestore();
    }
  });

  it("leaves a gap of days to the backfill job", async () => {
    history = historyEnding(4 * 24 * 60);

    const stats = await run();

    expect(stats.history.recorded).toBe(false);
    expect(fetchEveRefSnapshot).not.toHaveBeenCalled();
    expect(commits).toHaveLength(0);
  });

  it("waits for EVE Ref when it fails soon after a gap opened", async () => {
    history = historyEnding(90);
    eveRefFiles = hourlyFiles(1, 60);
    eveRefError = new Error("EVE Ref 503");

    const stats = await run();

    expect(stats.history.recorded).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("retrying next run"),
      expect.objectContaining({ error: "Error: EVE Ref 503" }),
    );
  });

  it("gives up on the gap when EVE Ref has failed for hours", async () => {
    history = historyEnding(7 * 60);
    eveRefFiles = hourlyFiles(1, 60);
    eveRefError = new Error("EVE Ref 503");

    const stats = await run();

    expect(stats.history.recorded).toBe(true);
    expect(commits[0]?.snapshots.map((s) => s.source)).toEqual(["esi"]);
  });

  it("ignores an ESI response listing too few systems", async () => {
    history = historyEnding(5);
    esiSystems = [held(31000001, 99)];

    const stats = await run();

    expect(stats.history.recorded).toBe(false);
    expect(commits).toHaveLength(0);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("too few systems"),
      expect.anything(),
    );
  });
});
