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
import type { SovereigntyRow } from "../helpers/planSovereigntyUpdates";
import type { syncSovereignty as SyncSovereignty } from "../jobs/scrape/esi/syncSovereignty";
import { toSovereigntyRow } from "../helpers/planSovereigntyUpdates";

// @swc/jest doesn't hoist jest.mock, so the mock fns are declared first and the
// factories close over them; the module is imported lazily in beforeAll. ESI
// and Prisma are stubbed; planSovereigntyUpdates runs for real.
let esiSystems: SovereigntySystemsSolarsystem[];
jest.mock("@jitaspace/esi-client", () => ({
  getSovereigntySystems: () =>
    Promise.resolve({ data: { solar_systems: esiSystems } }),
}));

type Rows = Record<string, unknown>[];
const sovFindMany = jest.fn<(a?: unknown) => Promise<SovereigntyRow[]>>();
const sovCreateMany = jest.fn((_a: unknown) => Promise.resolve({ count: 0 }));
const sovUpdate = jest.fn((_a: unknown) => Promise.resolve({}));
const sovDeleteMany = jest.fn((_a: unknown) => Promise.resolve({ count: 0 }));
const solarSystemFindMany = jest.fn<(a?: unknown) => Promise<Rows>>();

jest.mock("../db", () => ({
  prisma: {
    solarSystemSovereignty: {
      findMany: (a?: unknown) => sovFindMany(a),
      createMany: (a: unknown) => sovCreateMany(a),
      update: (a: unknown) => sovUpdate(a),
      deleteMany: (a: unknown) => sovDeleteMany(a),
    },
    solarSystem: { findMany: (a?: unknown) => solarSystemFindMany(a) },
  },
}));

let syncSovereignty: typeof SyncSovereignty;

beforeAll(async () => {
  ({ syncSovereignty } = await import("../jobs/scrape/esi/syncSovereignty"));
});

const logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} satisfies JobLogger;

const held = (
  solarSystemId: number,
  allianceId: number,
): SovereigntySystemsSolarsystem => ({
  solar_system_id: solarSystemId,
  claim: {
    alliance: {
      alliance_id: allianceId,
      corporation_id: 98000001,
      claimed_since: "2020-01-01T00:00:00Z",
      is_capital_system: false,
      sovereignty_hub: { id: 1030000000000 + solarSystemId },
      development: {
        activity_defense_multiplier: 1,
        military_level: 0,
        industrial_level: 0,
        strategic_level: 0,
      },
    },
  },
});

beforeEach(() => {
  jest.clearAllMocks();
  esiSystems = [];
  sovFindMany.mockResolvedValue([]);
  solarSystemFindMany.mockImplementation((a) =>
    Promise.resolve(
      (
        a as { where: { solarSystemId: { in: number[] } } }
      ).where.solarSystemId.in.map((solarSystemId) => ({ solarSystemId })),
    ),
  );
});

describe("syncSovereignty", () => {
  it("creates, updates and deletes only what changed, and reports holders", async () => {
    esiSystems = [
      held(1, 10), // new
      held(2, 20), // taken from 10
      held(3, 30), // unchanged
      { solar_system_id: 4, claim: { faction: { faction_id: 500007 } } },
    ];
    sovFindMany.mockResolvedValue([
      toSovereigntyRow(held(2, 10)),
      toSovereigntyRow(held(3, 30)),
      toSovereigntyRow({
        solar_system_id: 4,
        claim: { faction: { faction_id: 500007 } },
      }),
      toSovereigntyRow(held(5, 50)), // no longer listed
    ]);

    const result = await syncSovereignty({
      knownAllianceIds: new Set([10, 20, 30]),
      logger,
    });

    expect(sovCreateMany).toHaveBeenCalledWith({
      data: [toSovereigntyRow(held(1, 10))],
    });
    expect(sovUpdate).toHaveBeenCalledTimes(1);
    expect(sovUpdate).toHaveBeenCalledWith({
      where: { solarSystemId: 2 },
      data: expect.objectContaining({ allianceId: 20 }),
    });
    expect(sovDeleteMany).toHaveBeenCalledWith({
      where: { solarSystemId: { in: [5] } },
    });
    expect(result.affectedAllianceIds.sort((a, b) => a - b)).toEqual([
      10, 20, 50,
    ]);
    expect(result.stats).toEqual({
      systems: 4,
      allianceHeld: 3,
      added: 1,
      updated: 1,
      removed: 1,
      skipped: 0,
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("writes nothing when nothing changed", async () => {
    esiSystems = [held(1, 10)];
    sovFindMany.mockResolvedValue([toSovereigntyRow(held(1, 10))]);

    const result = await syncSovereignty({
      knownAllianceIds: new Set([10]),
      logger,
    });

    expect(sovCreateMany).not.toHaveBeenCalled();
    expect(sovUpdate).not.toHaveBeenCalled();
    expect(sovDeleteMany).not.toHaveBeenCalled();
    expect(result.affectedAllianceIds).toEqual([]);
  });

  it("warns about and skips claims it cannot store", async () => {
    esiSystems = [held(1, 10), held(2, 99)];
    // system 1 is not in our SDE tables yet
    solarSystemFindMany.mockResolvedValue([{ solarSystemId: 2 }]);

    const result = await syncSovereignty({
      knownAllianceIds: new Set([10]),
      logger,
    });

    expect(sovCreateMany).not.toHaveBeenCalled();
    expect(result.stats.skipped).toBe(2);
    expect(logger.warn).toHaveBeenCalledWith(
      "Skipped sovereignty claims we cannot store yet",
      { solarSystemIds: [1, 2] },
    );
  });
});
