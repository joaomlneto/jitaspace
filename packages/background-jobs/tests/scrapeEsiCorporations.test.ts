import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import type { scrapeEsiCorporations as ScrapeEsiCorporations } from "../jobs/scrape/esi/scrapeEsiCorporations";

// @swc/jest doesn't hoist jest.mock, so the mock fns are declared first and the
// factories close over them; the job is imported lazily in beforeAll (after the
// mocks register). ESI, Prisma, p-limit (ESM-only) and the reference-
// bootstrapping helper are stubbed; the batch step, updateTable and compareSets
// run for real, since the defect under test is the batch feeding compareSets a
// duplicated record.
jest.mock("p-limit", () => ({
  __esModule: true,
  default: () => (fn: () => unknown) => fn(),
}));

interface CorporationStub {
  ceo_id?: number;
  creator_id?: number;
}

let corporations: Map<number, CorporationStub>;

const getCorporationsCorporationId = jest.fn((corporationId: number) => {
  const { ceo_id, creator_id } = corporations.get(corporationId) ?? {};
  return Promise.resolve({
    data: {
      ceo_id,
      creator_id,
      description: "",
      friendly_fire: "illegal",
      home_station_id: 60003760,
      member_count: 1,
      name: `Corporation ${corporationId}`,
      shares: 1000,
      state: "active",
      tax_rates: { isk: 10, loyalty_point: 10 },
      ticker: "TEST",
      type: "player_owned",
      war_eligible: true,
    },
  });
});

const getCharactersDetail = jest.fn((characterId: number) =>
  Promise.resolve({
    data: {
      birthday: "2020-01-01T00:00:00Z",
      bloodline_id: 1,
      corporation_id: 98000001,
      gender: "male",
      name: `Character ${characterId}`,
      race_id: 1,
    },
  }),
);

const createCorpAndItsRefRecords = jest.fn(() => Promise.resolve(undefined));

const prisma = {
  character: {
    findMany: jest.fn(() => Promise.resolve([])),
    createMany: jest.fn(() => Promise.resolve({ count: 0 })),
    update: jest.fn(() => Promise.resolve({})),
    updateMany: jest.fn(() => Promise.resolve({ count: 0 })),
  },
  corporation: {
    findMany: jest.fn(() => Promise.resolve([])),
    createMany: jest.fn(() => Promise.resolve({ count: 0 })),
    update: jest.fn(() => Promise.resolve({})),
    updateMany: jest.fn(() => Promise.resolve({ count: 0 })),
  },
};

jest.mock("@jitaspace/esi-client", () => ({
  getCharactersDetail,
  getCorporationsCorporationId,
}));
jest.mock("../db", () => ({ prisma }));
jest.mock("../helpers/createCorpAndItsRefs.ts", () => ({
  createCorpAndItsRefRecords,
}));

let scrapeEsiCorporations: typeof ScrapeEsiCorporations;

beforeAll(async () => {
  ({ scrapeEsiCorporations } =
    await import("../jobs/scrape/esi/scrapeEsiCorporations"));
});

beforeEach(() => {
  jest.clearAllMocks();
  corporations = new Map();
});

const runBatch = (corporationIds: number[]) =>
  scrapeEsiCorporations.handler({
    payload: { corporationIds },
    run: (_name: string, fn: () => unknown) => fn(),
  } as unknown as Parameters<typeof scrapeEsiCorporations.handler>[0]);

/** Every characterId handed to prisma.character.createMany, in call order. */
const createdCharacterIds = () =>
  prisma.character.createMany.mock.calls.flatMap((call) =>
    (call as unknown as [{ data: { characterId: number }[] }])[0].data.map(
      (row) => row.characterId,
    ),
  );

describe("scrapeEsiCorporations", () => {
  it("syncs a founder who is still the CEO once instead of aborting the batch", async () => {
    corporations.set(98000001, { ceo_id: 90000001, creator_id: 90000001 });

    await expect(runBatch([98000001])).resolves.toBeDefined();

    expect(createdCharacterIds()).toEqual([90000001]);
    expect(getCharactersDetail).toHaveBeenCalledTimes(1);
  });

  it("syncs a character who founded several corporations in the batch once", async () => {
    corporations.set(98000001, { ceo_id: 90000002, creator_id: 90000001 });
    corporations.set(98000002, { ceo_id: 90000003, creator_id: 90000001 });

    await expect(runBatch([98000001, 98000002])).resolves.toBeDefined();

    const created = createdCharacterIds();
    expect(created).toHaveLength(3);
    expect(created).toEqual(
      expect.arrayContaining([90000001, 90000002, 90000003]),
    );
    expect(getCharactersDetail).toHaveBeenCalledTimes(3);
  });

  it("skips corporations with no CEO or founder", async () => {
    // ESI omits both for NPC and closed corporations since compatibility date
    // 2026-08-18, where it used to send the placeholder id 1.
    corporations.set(98000001, {});

    await expect(runBatch([98000001])).resolves.toBeDefined();

    expect(getCharactersDetail).not.toHaveBeenCalled();
  });
});
