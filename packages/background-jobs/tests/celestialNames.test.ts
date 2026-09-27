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
import {
  asteroidBeltNames,
  moonNames,
  planetNames,
  solarSystemNames,
} from "../helpers/celestialNames";
import * as celestialNames from "../helpers/celestialNames";
import * as sdeFields from "../helpers/sdeFields";

/**
 * A celestial CCP ships a `uniqueName` for is called exactly that, and it need
 * not follow the "<planet> - Moon|Asteroid Belt <orbitIndex>" pattern. The moon
 * and belt jobs once built that pattern inline instead of going through these
 * helpers, and got 3 of 137 named moons and 16 of 46 named belts wrong in build
 * 3542233 — rows the ESI solar-system scraper, which writes the same `name`
 * column with the right value, then kept overwriting.
 *
 * The fixtures are those real records, abridged.
 */

// ---------------------------------------------------------------- fixtures
const UPLINGUR = 30000182;
const KOR_AZOR_PRIME = 30003600;

const systems: SdeRecord = {
  [UPLINGUR]: { name: { en: "Uplingur" } },
  [KOR_AZOR_PRIME]: { name: { en: "Kor-Azor Prime" } },
};

const NDORIA = 40002444; // Uplingur IV, named
const ECLIPTICUM = 40319254; // Kor-Azor Prime IV, named
const UPLINGUR_II = 40002422; // unnamed

const planets: SdeRecord = {
  [NDORIA]: {
    solarSystemID: UPLINGUR,
    celestialIndex: 4,
    uniqueName: { en: "Uplingur IV (Ndoria)", de: "Uplingur IV (Ndoria)" },
  },
  [ECLIPTICUM]: {
    solarSystemID: KOR_AZOR_PRIME,
    celestialIndex: 4,
    uniqueName: { en: "Kor-Azor Prime IV (Eclipticum)" },
  },
  [UPLINGUR_II]: { solarSystemID: UPLINGUR, celestialIndex: 2 },
};

const moons: SdeRecord = {
  // A lore moon: the name carries no number at all.
  40319255: {
    orbitID: ECLIPTICUM,
    orbitIndex: 1,
    uniqueName: { en: "Kor-Azor Prime IV (Eclipticum) - Moon Griklaeum" },
  },
  // Named, and happens to agree with the pattern.
  40002445: {
    orbitID: NDORIA,
    orbitIndex: 1,
    uniqueName: { en: "Uplingur IV (Ndoria) - Moon 1" },
  },
  40002423: { orbitID: UPLINGUR_II, orbitIndex: 3 },
};

const belts: SdeRecord = {
  // Named belts are numbered in sequence, not by orbit slot: orbitIndex 5 is
  // "Asteroid Belt 3".
  40002463: {
    orbitID: NDORIA,
    orbitIndex: 5,
    uniqueName: { en: "Uplingur IV (Ndoria) - Asteroid Belt 3" },
  },
  40002424: { orbitID: UPLINGUR_II, orbitIndex: 2 },
};

const EXPECTED_MOONS = new Map([
  [40319255, "Kor-Azor Prime IV (Eclipticum) - Moon Griklaeum"],
  [40002445, "Uplingur IV (Ndoria) - Moon 1"],
  [40002423, "Uplingur II - Moon 3"],
]);
const EXPECTED_BELTS = new Map([
  [40002463, "Uplingur IV (Ndoria) - Asteroid Belt 3"],
  [40002424, "Uplingur II - Asteroid Belt 2"],
]);

// ---------------------------------------------------------------- helpers
describe("celestial name helpers", () => {
  const planetNameById = planetNames(planets, solarSystemNames(systems));

  it("names planets by uniqueName, else system and Roman celestialIndex", () => {
    expect(planetNameById.get(NDORIA)).toBe("Uplingur IV (Ndoria)");
    expect(planetNameById.get(UPLINGUR_II)).toBe("Uplingur II");
  });

  it("names moons by uniqueName, else planet and orbitIndex", () => {
    expect(moonNames(moons, planetNameById)).toEqual(EXPECTED_MOONS);
  });

  it("names asteroid belts by uniqueName, else planet and orbitIndex", () => {
    expect(asteroidBeltNames(belts, planetNameById)).toEqual(EXPECTED_BELTS);
  });
});

// ---------------------------------------------------------------- the jobs
// What regressed was a job building its own name rather than asking the
// helper, so the rows the jobs actually emit are checked too.
//
// @swc/jest doesn't hoist jest.mock, so the mocks are declared first and the
// jobs are imported lazily in beforeAll.
const loadSdeFiles = jest.fn<(names: string[]) => Promise<SdeRecord>>();
const ingestSdeTable =
  jest.fn<
    (options: {
      records: SdeRecord;
      toRow: (record: Record<string, unknown>, id: number) => { name: string };
    }) => Promise<unknown>
  >();

jest.mock("../db", () => ({ prisma: { moon: {}, asteroidBelt: {} } }));
jest.mock("../helpers", () => ({
  ...sdeFields,
  ...celestialNames,
  ingestSdeTable,
  loadSdeFiles,
}));

let ingestSdeMoons: typeof IngestSdeMoons;
let ingestSdeAsteroidBelts: typeof IngestSdeAsteroidBelts;

beforeAll(async () => {
  ({ ingestSdeMoons } = await import("../jobs/scrape/sde/ingestSdeMoons"));
  ({ ingestSdeAsteroidBelts } =
    await import("../jobs/scrape/sde/ingestSdeAsteroidBelts"));
});

beforeEach(() => {
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

/** The `name` of every row the job hands to `ingestSdeTable`. */
const emittedNames = () => {
  const { records, toRow } = ingestSdeTable.mock.calls[0]![0];
  return new Map(
    Object.entries(records).map(([id, record]) => [
      Number(id),
      toRow(record as Record<string, unknown>, Number(id)).name,
    ]),
  );
};

describe("the celestial ingest jobs", () => {
  it("writes each moon's uniqueName, not a rebuilt pattern", async () => {
    await ingestSdeMoons.handler(
      {} as Parameters<typeof ingestSdeMoons.handler>[0],
    );
    expect(emittedNames()).toEqual(EXPECTED_MOONS);
  });

  it("writes each asteroid belt's uniqueName, not a rebuilt pattern", async () => {
    await ingestSdeAsteroidBelts.handler(
      {} as Parameters<typeof ingestSdeAsteroidBelts.handler>[0],
    );
    expect(emittedNames()).toEqual(EXPECTED_BELTS);
  });
});
