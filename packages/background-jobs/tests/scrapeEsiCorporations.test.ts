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
  alliance_id?: number;
  ceo_id?: number;
  creator_id?: number;
  enlisted_faction_id?: number;
  home_station_id?: number;
}

let corporations: Map<number, CorporationStub>;
/** The corporation each character is in now, per ESI; 98000001 by default. */
let characterCorporations: Map<number, number>;

const getCorporationsCorporationId = jest.fn((corporationId: number) => {
  const {
    alliance_id,
    ceo_id,
    creator_id,
    enlisted_faction_id,
    home_station_id = 60003760,
  } = corporations.get(corporationId) ?? {};
  return Promise.resolve({
    data: {
      alliance_id,
      ceo_id,
      creator_id,
      description: "",
      enlisted_faction_id,
      friendly_fire: "illegal",
      home_station_id,
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
      corporation_id: characterCorporations.get(characterId) ?? 98000001,
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
  characterCorporations = new Map();
});

const runBatch = (corporationIds: number[]) =>
  scrapeEsiCorporations.handler({
    payload: { corporationIds },
    run: (_name: string, fn: () => unknown) => fn(),
  } as unknown as Parameters<typeof scrapeEsiCorporations.handler>[0]);

/** The sets of IDs the job asked the reference helper to make sure exist. */
const requestedReferences = () => {
  expect(createCorpAndItsRefRecords).toHaveBeenCalledTimes(1);
  const [args] = createCorpAndItsRefRecords.mock.calls[0] as unknown as [
    Record<string, Set<number>>,
  ];
  return Object.fromEntries(
    Object.entries(args).map(([key, ids]) => [key, [...ids].sort()]),
  );
};

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

  it("bootstraps the corporation an existing CEO has since moved to", async () => {
    // The CEO is already stored, so the helper would not fetch them; ESI now
    // puts them in 98000099, which we have never seen. Updating the character
    // without it violated Character_corporationId_fkey.
    corporations.set(98000001, { ceo_id: 90000001, creator_id: 90000002 });
    characterCorporations.set(90000001, 98000099);
    prisma.character.findMany.mockImplementationOnce(() =>
      Promise.resolve([
        {
          characterId: 90000001,
          birthday: new Date("2020-01-01T00:00:00Z"),
          bloodlineId: 1,
          corporationId: 98000001,
          description: null,
          factionId: null,
          gender: "male",
          name: "Character 90000001",
          raceId: 1,
          securityStatus: null,
          title: null,
          isDeleted: false,
        },
      ] as never),
    );

    await expect(runBatch([98000001])).resolves.toBeDefined();

    expect(requestedReferences().missingCorporationIds).toEqual([
      98000001, 98000099,
    ]);
    const updates = prisma.character.update.mock.calls.map(
      (call) =>
        (
          call as unknown as [
            {
              where: { characterId: number };
              data: { corporationId: number };
            },
          ]
        )[0],
    );
    expect(updates).toEqual([
      expect.objectContaining({
        where: { characterId: 90000001 },
        data: expect.objectContaining({ corporationId: 98000099 }),
      }),
    ]);
    // The references exist before any row is written that points at them.
    expect(createCorpAndItsRefRecords.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.character.update.mock.invocationCallOrder[0]!,
    );
  });

  it("bootstraps the alliance, home station and factions the update references", async () => {
    corporations.set(98000001, {
      alliance_id: 99000001,
      ceo_id: 90000001,
      enlisted_faction_id: 500001,
      home_station_id: 60008494,
    });

    await expect(runBatch([98000001])).resolves.toBeDefined();

    expect(requestedReferences()).toEqual({
      missingAllianceIds: [99000001],
      missingCharacterIds: [90000001],
      missingCorporationIds: [98000001],
      missingFactionIds: [500001],
      missingStationIds: [60008494],
    });
  });

  it("survives a deleted CEO and marks the stored character deleted", async () => {
    // ESI answers 404 "Character has been deleted!" for a biomassed character,
    // which used to fail the whole batch.
    corporations.set(98000001, { ceo_id: 90000001, creator_id: 90000002 });
    getCharactersDetail.mockImplementationOnce(() =>
      Promise.reject(
        Object.assign(new Error("Request failed with status code 404"), {
          isAxiosError: true,
          response: { status: 404 },
        }),
      ),
    );
    prisma.character.findMany.mockImplementationOnce(() =>
      Promise.resolve([
        {
          characterId: 90000001,
          birthday: new Date("2020-01-01T00:00:00Z"),
          bloodlineId: 1,
          corporationId: 98000001,
          description: null,
          factionId: null,
          gender: "male",
          name: "Character 90000001",
          raceId: 1,
          securityStatus: null,
          title: null,
          isDeleted: false,
        },
      ] as never),
    );

    await expect(runBatch([98000001])).resolves.toBeDefined();

    expect(createdCharacterIds()).toEqual([90000002]);
    const deletions = prisma.character.updateMany.mock.calls.map(
      (call) =>
        (
          call as unknown as [
            {
              data: { isDeleted: boolean };
              where: { characterId: { in: number[] } };
            },
          ]
        )[0],
    );
    expect(deletions).toEqual([
      {
        data: { isDeleted: true },
        where: { characterId: { in: [90000001] } },
      },
    ]);
  });

  it("still fails the batch on other ESI errors", async () => {
    corporations.set(98000001, { ceo_id: 90000001 });
    getCharactersDetail.mockImplementationOnce(() =>
      Promise.reject(
        Object.assign(new Error("Request failed with status code 502"), {
          isAxiosError: true,
          response: { status: 502 },
        }),
      ),
    );

    await expect(runBatch([98000001])).rejects.toThrow("502");
  });
});
