import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import type { SdeRecord } from "@jitaspace/sde-utils";

import type { ingestSdeAsteroidBelts as IngestSdeAsteroidBelts } from "../jobs/scrape/sde/ingestSdeAsteroidBelts";
import type { ingestSdeMoons as IngestSdeMoons } from "../jobs/scrape/sde/ingestSdeMoons";
import type { ingestSdePlanets as IngestSdePlanets } from "../jobs/scrape/sde/ingestSdePlanets";
import * as celestialNames from "../helpers/celestialNames";
import * as sdeFields from "../helpers/sdeFields";

/**
 * The celestial ingests used to read `celestialIndex` / `orbitIndex` only to
 * build a name, and store neither — so a planet's or moon's order survived only
 * as text inside its name. That stopped being recoverable once named moons kept
 * their `uniqueName` ("Moon Griklaeum" carries no number), and a named belt's
 * number never matched its `orbitIndex` to begin with. The indices are now
 * columns of their own; these tests pin that the jobs write them.
 *
 * The fixtures are real build-3542233 records, abridged.
 */

const UPLINGUR = 30000182;
const KOR_AZOR_PRIME = 30003600;
const ECLIPTICUM = 40319254; // Kor-Azor Prime IV, named
const NDORIA = 40002444; // Uplingur IV, named
const UPLINGUR_II = 40002422;

const systems: SdeRecord = {
  [UPLINGUR]: { name: { en: "Uplingur" } },
  [KOR_AZOR_PRIME]: { name: { en: "Kor-Azor Prime" } },
};

const planets: SdeRecord = {
  [ECLIPTICUM]: {
    solarSystemID: KOR_AZOR_PRIME,
    typeID: 11,
    celestialIndex: 4,
    uniqueName: { en: "Kor-Azor Prime IV (Eclipticum)" },
  },
  [NDORIA]: {
    solarSystemID: UPLINGUR,
    typeID: 11,
    celestialIndex: 4,
    uniqueName: { en: "Uplingur IV (Ndoria)" },
  },
  [UPLINGUR_II]: { solarSystemID: UPLINGUR, typeID: 11, celestialIndex: 2 },
};

const moons: SdeRecord = {
  // A lore moon: its name carries no number, so orbitIndex is its only order.
  40319256: {
    orbitID: ECLIPTICUM,
    celestialIndex: 4,
    orbitIndex: 2,
    uniqueName: { en: "Kor-Azor Prime IV (Eclipticum) - Moon Black Viperia" },
  },
  40002423: { orbitID: UPLINGUR_II, celestialIndex: 2, orbitIndex: 3 },
};

const belts: SdeRecord = {
  // Named belts are numbered in sequence, not by orbit slot.
  40002463: {
    orbitID: NDORIA,
    celestialIndex: 4,
    orbitIndex: 5,
    uniqueName: { en: "Uplingur IV (Ndoria) - Asteroid Belt 3" },
  },
  40002424: { orbitID: UPLINGUR_II, celestialIndex: 2, orbitIndex: 2 },
};

// @swc/jest doesn't hoist jest.mock, so the mocks are declared first and the
// jobs are imported lazily in beforeAll.
const loadSdeFiles = jest.fn<(names: string[]) => Promise<SdeRecord>>();
const ingestSdeTable =
  jest.fn<
    (options: {
      records: SdeRecord;
      toRow: (
        record: Record<string, unknown>,
        id: number,
      ) => Record<string, unknown>;
    }) => Promise<unknown>
  >();

jest.mock("../db", () => ({
  prisma: { planet: {}, moon: {}, asteroidBelt: {} },
}));
jest.mock("../helpers", () => ({
  ...sdeFields,
  ...celestialNames,
  ingestSdeTable,
  loadSdeFiles,
}));

let ingestSdePlanets: typeof IngestSdePlanets;
let ingestSdeMoons: typeof IngestSdeMoons;
let ingestSdeAsteroidBelts: typeof IngestSdeAsteroidBelts;

beforeAll(async () => {
  ({ ingestSdePlanets } = await import("../jobs/scrape/sde/ingestSdePlanets"));
  ({ ingestSdeMoons } = await import("../jobs/scrape/sde/ingestSdeMoons"));
  ({ ingestSdeAsteroidBelts } =
    await import("../jobs/scrape/sde/ingestSdeAsteroidBelts"));
});

beforeEach(() => {
  ingestSdeTable.mockClear();
  loadSdeFiles.mockResolvedValue({
    "mapSolarSystems.yaml": systems,
    "mapPlanets.yaml": planets,
    "mapMoons.yaml": moons,
    "mapAsteroidBelts.yaml": belts,
  });
  ingestSdeTable.mockResolvedValue({
    created: 0,
    modified: 0,
    deleted: 0,
    equal: 0,
  });
});

/** The given columns of every row the job hands to `ingestSdeTable`. */
const emitted = (columns: string[]) => {
  const { records, toRow } = ingestSdeTable.mock.calls[0]![0];
  return new Map(
    Object.entries(records).map(([id, record]) => {
      const row = toRow(record as Record<string, unknown>, Number(id));
      return [
        Number(id),
        Object.fromEntries(columns.map((column) => [column, row[column]])),
      ];
    }),
  );
};

describe("celestial order indices", () => {
  it("stores each planet's celestialIndex", async () => {
    await ingestSdePlanets.handler(
      {} as Parameters<typeof ingestSdePlanets.handler>[0],
    );
    expect(emitted(["celestialIndex"])).toEqual(
      new Map([
        [ECLIPTICUM, { celestialIndex: 4 }],
        [NDORIA, { celestialIndex: 4 }],
        [UPLINGUR_II, { celestialIndex: 2 }],
      ]),
    );
  });

  it("stores each moon's celestialIndex and orbitIndex, named or not", async () => {
    await ingestSdeMoons.handler(
      {} as Parameters<typeof ingestSdeMoons.handler>[0],
    );
    expect(emitted(["name", "celestialIndex", "orbitIndex"])).toEqual(
      new Map([
        [
          40319256,
          {
            name: "Kor-Azor Prime IV (Eclipticum) - Moon Black Viperia",
            celestialIndex: 4,
            orbitIndex: 2,
          },
        ],
        [
          40002423,
          { name: "Uplingur II - Moon 3", celestialIndex: 2, orbitIndex: 3 },
        ],
      ]),
    );
  });

  it("stores each asteroid belt's orbitIndex, even where the name's number differs", async () => {
    await ingestSdeAsteroidBelts.handler(
      {} as Parameters<typeof ingestSdeAsteroidBelts.handler>[0],
    );
    expect(emitted(["name", "celestialIndex", "orbitIndex"])).toEqual(
      new Map([
        [
          40002463,
          {
            name: "Uplingur IV (Ndoria) - Asteroid Belt 3",
            celestialIndex: 4,
            orbitIndex: 5,
          },
        ],
        [
          40002424,
          {
            name: "Uplingur II - Asteroid Belt 2",
            celestialIndex: 2,
            orbitIndex: 2,
          },
        ],
      ]),
    );
  });
});
