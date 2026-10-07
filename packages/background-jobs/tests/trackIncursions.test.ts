import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import type { IncursionsGet } from "@jitaspace/esi-client";

import type { JobLogger } from "../core";
import type { trackIncursions as TrackIncursions } from "../jobs/scrape/esi/trackIncursions";

// @swc/jest doesn't hoist jest.mock, so the mock fns are declared first and the
// factories close over them; the module is imported lazily in beforeAll. ESI
// and Prisma are stubbed; planIncursionUpdates runs for real.
let esiIncursions: IncursionsGet;
const getIncursions = jest.fn((_headers?: unknown, _config?: unknown) =>
  Promise.resolve({ data: esiIncursions }),
);
jest.mock("@jitaspace/esi-client", () => ({
  getIncursions: (headers?: unknown, config?: unknown) =>
    getIncursions(headers, config),
}));

type Row = Record<string, unknown>;
const findMany = jest.fn<(a?: unknown) => Promise<Row[]>>();
const aggregate = jest.fn<(a?: unknown) => Promise<Row>>();
const create = jest.fn((_a: unknown) => Promise.resolve({}));
const update = jest.fn((_a: unknown) => Promise.resolve({}));
const updateMany = jest.fn((_a: unknown) => Promise.resolve({ count: 0 }));
const sovFindMany = jest.fn<(a?: unknown) => Promise<Row[]>>();
const tx = {
  incursion: {
    findMany: (a?: unknown) => findMany(a),
    aggregate: (a?: unknown) => aggregate(a),
    create: (a: unknown) => create(a),
    update: (a: unknown) => update(a),
    updateMany: (a: unknown) => updateMany(a),
  },
  solarSystemSovereignty: { findMany: (a?: unknown) => sovFindMany(a) },
};
jest.mock("../db", () => ({
  prisma: {
    $transaction: (fn: (client: typeof tx) => Promise<unknown>) => fn(tx),
  },
}));

let trackIncursions: typeof TrackIncursions;

beforeAll(async () => {
  ({ trackIncursions } = await import("../jobs/scrape/esi/trackIncursions"));
});

const logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} satisfies JobLogger;

const run = () => trackIncursions.handler({ payload: {}, logger } as never);

const esi = (
  overrides: Partial<IncursionsGet[number]> = {},
): IncursionsGet[number] => ({
  constellation_id: 20000396,
  faction_id: 500019,
  has_boss: false,
  infested_solar_systems: [30002706, 30002708],
  influence: 1,
  staging_solar_system_id: 30002708,
  state: "established",
  type: "Incursion",
  ...overrides,
});

const row = (overrides: Row = {}): Row => ({
  incursionId: 1,
  constellationId: 20000396,
  factionId: 500019,
  type: "Incursion",
  stagingSolarSystemId: 30002708,
  state: "established",
  influence: 1,
  hasBoss: false,
  endedAt: null,
  establishedAt: new Date("2026-10-05T08:10:00Z"),
  mobilizingAt: null,
  withdrawingAt: null,
  infestedSolarSystems: [
    { solarSystemId: 30002708 },
    { solarSystemId: 30002706 },
  ],
  ...overrides,
});

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000);

beforeEach(() => {
  jest.clearAllMocks();
  esiIncursions = [esi()];
  findMany.mockResolvedValue([]);
  aggregate.mockResolvedValue({ _max: { lastSeenAt: minutesAgo(5) } });
  sovFindMany.mockResolvedValue([]);
});

describe("trackIncursions", () => {
  it("asks ESI with a timeout, so a hung request fails fast", async () => {
    await run();
    const config = getIncursions.mock.calls[0]?.[1] as { signal?: unknown };
    expect(config.signal).toBeInstanceOf(AbortSignal);
  });

  it("creates a new incursion with its systems, sovereignty and appearance", async () => {
    sovFindMany.mockResolvedValue([
      { solarSystemId: 30002708, allianceId: null, factionId: 500004 },
    ]);
    const result = (await run()) as { stats: Record<string, number> };

    const data = (create.mock.calls[0]?.[0] as { data: Row }).data;
    expect(data).toMatchObject({
      constellationId: 20000396,
      stagingSolarSystemId: 30002708,
      stagingSovereigntyAllianceId: null,
      stagingSovereigntyFactionId: 500004,
      isObservedFromStart: true,
      infestedSolarSystems: {
        create: [{ solarSystemId: 30002706 }, { solarSystemId: 30002708 }],
      },
    });
    expect(
      (data.events as { create: { kind: string }[] }).create.map((e) => e.kind),
    ).toEqual(["appeared"]);
    expect(result.stats).toMatchObject({ appeared: 1, events: 1 });
  });

  it("does not claim to have seen the start of one first listed after a gap", async () => {
    aggregate.mockResolvedValue({ _max: { lastSeenAt: minutesAgo(24 * 60) } });
    await run();
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      data: { isObservedFromStart: false },
    });
  });

  it("only moves lastSeenAt for an unchanged incursion", async () => {
    findMany.mockResolvedValue([row()]);
    await run();
    expect(updateMany).toHaveBeenCalledWith({
      where: { incursionId: { in: [1] } },
      data: { lastSeenAt: expect.any(Date) },
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("stores a type-only change through the full update", async () => {
    esiIncursions = [esi({ type: "Incursion II" })];
    findMany.mockResolvedValue([row()]);
    await run();
    expect(updateMany).not.toHaveBeenCalled();
    expect(update.mock.calls[0]?.[0]).toMatchObject({
      where: { incursionId: 1 },
      data: { type: "Incursion II" },
    });
  });

  it("writes changes, swaps systems and records each event", async () => {
    esiIncursions = [
      esi({
        influence: 0.4,
        infested_solar_systems: [30002708, 30002709],
      }),
    ];
    findMany.mockResolvedValue([row()]);
    await run();

    const { data } = update.mock.calls[0]?.[0] as { data: Row };
    expect(data).toMatchObject({
      influence: 0.4,
      infestedSolarSystems: {
        create: [{ solarSystemId: 30002709 }],
        deleteMany: { solarSystemId: { in: [30002706] } },
      },
    });
    expect(data).not.toHaveProperty("endedAt");
    expect(
      (data.events as { create: { kind: string }[] }).create.map((e) => e.kind),
    ).toEqual(["influence_changed", "system_added", "system_removed"]);
  });

  it("clears endedAt on an incursion listed again soon after it ended", async () => {
    findMany.mockResolvedValue([row({ endedAt: minutesAgo(10) })]);
    await run();
    expect(update.mock.calls[0]?.[0]).toMatchObject({
      data: {
        endedAt: null,
        events: { create: [expect.objectContaining({ kind: "resumed" })] },
      },
    });
  });

  it("ends an incursion ESI no longer lists", async () => {
    esiIncursions = [esi({ constellation_id: 20000001 })];
    findMany.mockResolvedValue([row()]);
    await run();
    expect(update).toHaveBeenCalledWith({
      where: { incursionId: 1 },
      data: {
        endedAt: expect.any(Date),
        events: {
          create: [
            expect.objectContaining({ kind: "ended", state: "established" }),
          ],
        },
      },
    });
  });

  it("writes nothing for a response listing no incursions while some are active", async () => {
    esiIncursions = [];
    findMany.mockResolvedValue([row()]);
    await run();
    expect(update).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("no incursions"),
    );
  });

  it("warns about, and does not match, a row missing ESI's fields", async () => {
    findMany.mockResolvedValue([row({ incursionId: 9, influence: null })]);
    await run();
    expect(logger.warn).toHaveBeenCalledWith(
      "Skipped incursions missing ESI's fields",
      { incursionIds: [9] },
    );
  });
});
