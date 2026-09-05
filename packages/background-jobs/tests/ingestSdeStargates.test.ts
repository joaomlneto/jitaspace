import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import type { SdeRecord } from "@jitaspace/sde-utils";

import type { ingestSdeStargates as IngestSdeStargates } from "../jobs/scrape/sde/ingestSdeStargates";
import * as sdeFields from "../helpers/sdeFields";

// @swc/jest doesn't hoist jest.mock, so the mocks are declared first and the
// factories close over them; the job is imported lazily in beforeAll.
//
// `Prisma.sql`/`Prisma.join` are stubbed as recorders rather than the real
// sql-template-tag: the point of these tests is the JS-side backfill logic
// (which rows are written, how they are chunked, what value each bind gets),
// which is what the deadlock fix rewrote. Whether the emitted SQL is valid
// PostgreSQL is not decidable without a live database.
const findMany =
  jest.fn<
    () => Promise<
      { stargateId: number; destinationStargateId: number | null }[]
    >
  >();
const executeRaw = jest.fn<(...args: unknown[]) => Promise<number>>();
const loadSdeFiles = jest.fn<(names: string[]) => Promise<SdeRecord>>();
const ingestSdeTable = jest.fn<() => Promise<unknown>>();

jest.mock("../db", () => ({
  prisma: { stargate: { findMany }, $executeRaw: executeRaw },
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
      kind: "sql" as const,
      values,
    }),
    join: (parts: unknown[]) => ({ kind: "join" as const, parts }),
  },
}));
jest.mock("../helpers", () => ({
  ingestSdeTable,
  loadSdeFiles,
  optionalNumber: sdeFields.optionalNumber,
  requiredNumber: sdeFields.requiredNumber,
  solarSystemNames: () => new Map<number, string>([[30000001, "Tanoo"]]),
}));

let ingestSdeStargates: typeof IngestSdeStargates;

beforeAll(async () => {
  ({ ingestSdeStargates } =
    await import("../jobs/scrape/sde/ingestSdeStargates"));
});

/** A `mapStargates.yaml` record; omit `destinationStargateId` to drop the id. */
const gate = (destinationStargateId: number | null) => ({
  solarSystemID: 30000001,
  typeID: 16,
  destination: {
    solarSystemID: 30000001,
    ...(destinationStargateId === null
      ? {}
      : { stargateID: destinationStargateId }),
  },
});

const runHandler = async () =>
  ingestSdeStargates.handler(
    {} as Parameters<typeof ingestSdeStargates.handler>[0],
  );

/** The (stargateId, destinationStargateId) pairs bound by one $executeRaw call. */
const boundPairs = (callIndex: number) => {
  const args = executeRaw.mock.calls[callIndex] ?? [];
  const join = args.find(
    (a): a is { kind: "join"; parts: { kind: "sql"; values: unknown[] }[] } =>
      typeof a === "object" &&
      a !== null &&
      (a as { kind?: string }).kind === "join",
  );
  return (join?.parts ?? []).map((p) => p.values);
};

beforeEach(() => {
  jest.clearAllMocks();
  ingestSdeTable.mockResolvedValue({
    created: 0,
    modified: 0,
    deleted: 0,
    equal: 0,
  });
  executeRaw.mockResolvedValue(0);
});

describe("ingest-sde-stargates destination backfill", () => {
  it("binds a missing destination as null rather than dropping the column", async () => {
    // The SDE omits `destination.stargateID`, and the row currently holds a
    // value — so the gate must be actively cleared, not skipped. This branch
    // never ran during the live verification (every real stargate has a
    // destination), so it is only covered here.
    loadSdeFiles.mockResolvedValue({
      "mapSolarSystems.yaml": {},
      "mapStargates.yaml": { 50000001: gate(null) },
    });
    findMany.mockResolvedValue([
      { stargateId: 50000001, destinationStargateId: 50000002 },
    ]);

    const result = (await runHandler()) as {
      stats: { destinationsBackfilled: number };
    };

    expect(executeRaw).toHaveBeenCalledTimes(1);
    expect(boundPairs(0)).toEqual([[50000001, null]]);
    expect(result.stats.destinationsBackfilled).toBe(1);
  });

  it("writes nothing when every destination already matches", async () => {
    loadSdeFiles.mockResolvedValue({
      "mapSolarSystems.yaml": {},
      "mapStargates.yaml": {
        50000001: gate(50000002),
        50000002: gate(50000001),
      },
    });
    findMany.mockResolvedValue([
      { stargateId: 50000001, destinationStargateId: 50000002 },
      { stargateId: 50000002, destinationStargateId: 50000001 },
    ]);

    const result = (await runHandler()) as {
      stats: { destinationsBackfilled: number };
    };

    // Idempotence: a converged table must not re-issue the UPDATE at all.
    expect(executeRaw).not.toHaveBeenCalled();
    expect(result.stats.destinationsBackfilled).toBe(0);
  });

  it("splits the backfill into chunks that stay under the bind-parameter limit", async () => {
    const CHUNK = 10_000;
    const records: Record<number, unknown> = {};
    for (let i = 0; i < CHUNK + 1; i++)
      records[50000000 + i] = gate(60000000 + i);
    loadSdeFiles.mockResolvedValue({
      "mapSolarSystems.yaml": {},
      "mapStargates.yaml": records,
    });
    findMany.mockResolvedValue([]); // cold table: everything needs backfilling

    await runHandler();

    expect(executeRaw).toHaveBeenCalledTimes(2);
    expect(boundPairs(0)).toHaveLength(CHUNK);
    expect(boundPairs(1)).toHaveLength(1);
    // 2 binds per row plus the shared updatedAt, well under PostgreSQL's 65535.
    expect(CHUNK * 2 + 1).toBeLessThan(65535);
  });

  it("stamps updatedAt itself, since @updatedAt is applied by Prisma Client", async () => {
    loadSdeFiles.mockResolvedValue({
      "mapSolarSystems.yaml": {},
      "mapStargates.yaml": { 50000001: gate(50000002) },
    });
    findMany.mockResolvedValue([]);

    await runHandler();

    const args = executeRaw.mock.calls[0] ?? [];
    expect(args.some((a) => a instanceof Date)).toBe(true);
  });
});
