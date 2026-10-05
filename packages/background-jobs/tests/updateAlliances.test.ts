import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import type { JobContext } from "../core";
import type { updateAlliances as UpdateAlliances } from "../jobs/scrape/esi/updateAlliances";

// @swc/jest doesn't hoist jest.mock, so the mock fns are declared first and the
// factories close over them; the job is imported lazily in beforeAll. ESI,
// Prisma, p-limit (ESM-only) and the reference-bootstrapping helper are
// stubbed; planAllianceUpdates runs for real.
jest.mock("p-limit", () => ({
  __esModule: true,
  default: () => (fn: () => unknown) => fn(),
}));

interface EsiAlliance {
  creator_corporation_id: number;
  creator_id: number;
  date_founded: string;
  executor_corporation_id?: number;
  faction_id?: number;
  name: string;
  ticker: string;
}

let esiAlliances: Map<number, EsiAlliance>;
let esiMembers: Map<number, number[]>;

const getAlliances = jest.fn(() =>
  Promise.resolve({ data: [...esiAlliances.keys()] }),
);
const getAlliancesAllianceId = jest.fn((allianceId: number) =>
  Promise.resolve({ data: esiAlliances.get(allianceId) }),
);
const getAlliancesAllianceIdCorporations = jest.fn((allianceId: number) =>
  Promise.resolve({ data: esiMembers.get(allianceId) ?? [] }),
);

jest.mock("@jitaspace/esi-client", () => ({
  getAlliances: () => getAlliances(),
  getAlliancesAllianceId: (id: number) => getAlliancesAllianceId(id),
  getAlliancesAllianceIdCorporations: (id: number) =>
    getAlliancesAllianceIdCorporations(id),
}));

const createCorpAndItsRefRecords = jest.fn((_args: unknown) =>
  Promise.resolve(undefined),
);
jest.mock("../helpers/createCorpAndItsRefs.ts", () => ({
  createCorpAndItsRefRecords: (args: unknown) =>
    createCorpAndItsRefRecords(args),
}));

type Rows = Record<string, unknown>[];
const allianceFindMany = jest.fn<(a?: unknown) => Promise<Rows>>();
const allianceUpdate = jest.fn((_a: unknown) => Promise.resolve({}));
const allianceUpdateMany = jest.fn((_a: unknown) =>
  Promise.resolve({ count: 0 }),
);
const corporationFindMany = jest.fn<(a?: unknown) => Promise<Rows>>();
const corporationUpdateMany = jest.fn((a: unknown) =>
  Promise.resolve({
    count: (a as { where: { corporationId: { in: number[] } } }).where
      .corporationId.in.length,
  }),
);

jest.mock("../db", () => ({
  prisma: {
    alliance: {
      findMany: (a?: unknown) => allianceFindMany(a),
      update: (a: unknown) => allianceUpdate(a),
      updateMany: (a: unknown) => allianceUpdateMany(a),
    },
    corporation: {
      findMany: (a?: unknown) => corporationFindMany(a),
      updateMany: (a: unknown) => corporationUpdateMany(a),
    },
  },
}));

let updateAlliances: typeof UpdateAlliances;

beforeAll(async () => {
  ({ updateAlliances } = await import("../jobs/scrape/esi/updateAlliances"));
});

const send = jest.fn((_jobId: string, _payload: unknown) => Promise.resolve());

interface RunResult {
  stats: {
    alliances: Record<string, number>;
    corporations: Record<string, number>;
  };
}

const run = () =>
  updateAlliances.handler({
    payload: {},
    attempt: 1,
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    run: (_name: string, fn: () => Promise<unknown>) => fn(),
    sleep: () => Promise.resolve(),
    send,
    invoke: () => Promise.reject(new Error("unused")),
  } as unknown as JobContext<Record<string, never>>) as Promise<RunResult>;

const esiAlliance = (overrides: Partial<EsiAlliance> = {}): EsiAlliance => ({
  creator_corporation_id: 1000,
  creator_id: 90000001,
  date_founded: "2020-01-01T00:00:00Z",
  executor_corporation_id: 1000,
  name: "Alliance",
  ticker: "TICK",
  ...overrides,
});

const dbAlliance = (allianceId: number, overrides: Rows[number] = {}) => ({
  allianceId,
  creatorCorporationId: 1000,
  dateFounded: new Date("2020-01-01T00:00:00Z"),
  executorCorporationId: 1000,
  factionId: null,
  name: "Alliance",
  ticker: "TICK",
  isDeleted: false,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  esiAlliances = new Map();
  esiMembers = new Map();
  allianceFindMany.mockResolvedValue([]);
  corporationFindMany.mockResolvedValue([]);
});

describe("esi-update-alliances", () => {
  it("is an hourly singleton cron job", () => {
    expect(updateAlliances.id).toBe("esi-update-alliances");
    expect(updateAlliances.trigger).toEqual({
      type: "cron",
      cron: "TZ=UTC 45 * * * *",
    });
    expect(updateAlliances.singleton).toBe(true);
  });

  it("writes nothing and evicts nothing when the database matches ESI", async () => {
    esiAlliances.set(1, esiAlliance());
    esiMembers.set(1, [1000]);
    allianceFindMany.mockResolvedValue([dbAlliance(1)]);
    corporationFindMany.mockResolvedValue([
      { corporationId: 1000, allianceId: 1 },
    ]);

    const { stats } = await run();

    expect(createCorpAndItsRefRecords).not.toHaveBeenCalled();
    expect(allianceUpdate).not.toHaveBeenCalled();
    expect(allianceUpdateMany).not.toHaveBeenCalled();
    expect(corporationUpdateMany).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(stats.alliances).toEqual({
      open: 1,
      added: 0,
      updated: 0,
      closed: 0,
      revalidated: 0,
    });
  });

  it("applies every kind of change and evicts the alliances it touched", async () => {
    // 1: executor changed. 2: new. 3: unchanged, but a corp left it for 1.
    // 4 (db only): closed.
    esiAlliances.set(1, esiAlliance({ executor_corporation_id: 1001 }));
    esiAlliances.set(2, esiAlliance({ faction_id: 500001 }));
    esiAlliances.set(3, esiAlliance());
    esiMembers.set(1, [1000, 1001, 3001]);
    esiMembers.set(2, [2000]);
    esiMembers.set(3, [3000]);
    allianceFindMany.mockResolvedValue([
      dbAlliance(1),
      dbAlliance(3),
      dbAlliance(4),
    ]);
    corporationFindMany.mockResolvedValue([
      { corporationId: 1000, allianceId: 1 },
      { corporationId: 1001, allianceId: 1 },
      { corporationId: 3000, allianceId: 3 },
      { corporationId: 3001, allianceId: 3 },
      { corporationId: 4000, allianceId: 4 },
    ]);

    const { stats } = await run();

    // The new alliance is created with its unknown member corporation.
    expect(createCorpAndItsRefRecords).toHaveBeenCalledWith({
      alliances: [
        expect.objectContaining({ allianceId: 2, factionId: 500001 }),
      ],
      missingCorporationIds: new Set([2000]),
    });
    expect(allianceUpdate).toHaveBeenCalledWith({
      where: { allianceId: 1 },
      data: expect.objectContaining({ executorCorporationId: 1001 }),
    });
    expect(allianceUpdateMany).toHaveBeenCalledWith({
      where: { allianceId: { in: [4] } },
      data: { isDeleted: true },
    });
    expect(corporationUpdateMany).toHaveBeenCalledWith({
      where: { corporationId: { in: [3001] } },
      data: { allianceId: 1 },
    });
    expect(corporationUpdateMany).toHaveBeenCalledWith({
      where: { corporationId: { in: [4000] } },
      data: { allianceId: null },
    });

    expect(send).toHaveBeenCalledTimes(1);
    const [jobId, payload] = send.mock.calls[0] ?? [];
    expect(jobId).toBe("revalidate-alliance-cache");
    expect(
      (payload as { allianceIds: number[] }).allianceIds.sort((a, b) => a - b),
    ).toEqual([1, 2, 3, 4]);

    expect(stats.alliances).toEqual({
      open: 3,
      added: 1,
      updated: 1,
      closed: 1,
      revalidated: 4,
    });
    expect(stats.corporations).toEqual({
      members: 5,
      added: 1,
      deferred: 0,
      moved: 2,
    });
  });

  it("creates at most 250 unknown corporations per run, and evicts their alliances", async () => {
    const memberIds = Array.from({ length: 300 }, (_, i) => 10_000 + i);
    esiAlliances.set(1, esiAlliance({ executor_corporation_id: 10_000 }));
    esiMembers.set(1, memberIds);
    allianceFindMany.mockResolvedValue([
      dbAlliance(1, { executorCorporationId: 10_000 }),
    ]);

    const { stats } = await run();

    const [args] = createCorpAndItsRefRecords.mock.calls[0] ?? [];
    expect(
      (args as { missingCorporationIds: Set<number> }).missingCorporationIds
        .size,
    ).toBe(250);
    expect(stats.corporations.added).toBe(250);
    expect(stats.corporations.deferred).toBe(50);
    expect(send).toHaveBeenCalledWith("revalidate-alliance-cache", {
      allianceIds: [1],
    });
  });
});
