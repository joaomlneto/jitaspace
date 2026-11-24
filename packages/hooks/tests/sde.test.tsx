import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";

import type * as UniverseModule from "../src/hooks/universe";
import type * as CelestialNamesModule from "../src/sde/celestialNames";
import type * as ClientModule from "../src/sde/client";
import type * as LocalizeModule from "../src/sde/localize";

// The SDE-over-HTTP layer: the axios client is mocked at the module boundary,
// so these run the real query keys, localisation and name composition.
// @swc/jest does not hoist jest.mock, so modules are required lazily.
const mockGet = jest.fn<(url: string, config?: unknown) => Promise<unknown>>();
jest.mock("axios", () => ({
  __esModule: true,
  default: { create: () => ({ get: mockGet }) },
}));
let mockLanguage: string | undefined = "en";
jest.mock("../src/hooks/useEsiAcceptLanguage", () => ({
  __esModule: true,
  useEsiAcceptLanguage: () => mockLanguage,
}));

const { fetchSdeRecord, fetchSdeTable } =
  require("../src/sde/client") as typeof ClientModule;
const { localizeRecord, sdeLanguage } =
  require("../src/sde/localize") as typeof LocalizeModule;
const { toRomanNumeral } =
  require("../src/sde/celestialNames") as typeof CelestialNamesModule;
const {
  useAsteroidBelt,
  useMoon,
  usePlanet,
  useRegionIds,
  useSolarSystem,
  useStar,
  useStargate,
} = require("../src/hooks/universe") as typeof UniverseModule;
const { QueryClient, QueryClientProvider } =
  require("@tanstack/react-query") as typeof import("@tanstack/react-query");
const { createElement } = require("react") as typeof import("react");

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, children);
}

const JITA = {
  solarSystemID: 30000142,
  constellationID: 20000020,
  regionID: 10000002,
  name: { en: "Jita", de: "Jita (de)" },
  planetIDs: [40009082],
  stargateIDs: [50001248],
  starID: 40009076,
  securityStatus: 0.945913,
  position: { x: 0, y: 0, z: 0 },
  radius: 1,
};
const MAURASI = { ...JITA, solarSystemID: 30000140, name: { en: "Maurasi" } };

/** Serve records by URL, as sde.evetech.net does. */
const RECORDS: Record<string, unknown> = {
  "/mapSolarSystems/30000142.json": JITA,
  "/mapSolarSystems/30000140.json": MAURASI,
  "/mapPlanets/40009082.json": {
    planetID: 40009082,
    solarSystemID: 30000142,
    celestialIndex: 4,
    typeID: 13,
  },
  "/mapPlanets/40002444.json": {
    planetID: 40002444,
    solarSystemID: 30000142,
    celestialIndex: 4,
    typeID: 13,
    uniqueName: { en: "Uplingur IV (Ndoria)" },
  },
  "/mapMoons/40009087.json": {
    moonID: 40009087,
    solarSystemID: 30000142,
    celestialIndex: 4,
    orbitIndex: 4,
    typeID: 14,
  },
  "/mapAsteroidBelts/40000003.json": {
    asteroidBeltID: 40000003,
    solarSystemID: 30000142,
    celestialIndex: 1,
    orbitIndex: 1,
    typeID: 15,
  },
  "/mapStars/40009076.json": {
    starID: 40009076,
    solarSystemID: 30000142,
    typeID: 3796,
    radius: 513100000,
  },
  "/mapStargates/50001248.json": {
    stargateID: 50001248,
    solarSystemID: 30000142,
    typeID: 16,
    destination: { solarSystemID: 30000140, stargateID: 50000802 },
  },
};

beforeEach(() => {
  mockLanguage = "en";
  mockGet.mockReset();
  mockGet.mockImplementation((url) =>
    url in RECORDS
      ? Promise.resolve({ data: RECORDS[url] })
      : Promise.reject(new Error(`404 ${url}`)),
  );
});

describe("the SDE client", () => {
  it("fetches one record by table and key", async () => {
    await expect(fetchSdeRecord("mapSolarSystems", 30000142)).resolves.toBe(
      JITA,
    );
    expect(mockGet).toHaveBeenCalledWith(
      "/mapSolarSystems/30000142.json",
      expect.anything(),
    );
  });

  it("parses a whole table from JSON Lines, skipping blank lines", async () => {
    mockGet.mockResolvedValue({
      data: '{"regionID":10000002}\n\n{"regionID":10000043}\n',
    });
    await expect(fetchSdeTable("mapRegions")).resolves.toEqual([
      { regionID: 10000002 },
      { regionID: 10000043 },
    ]);
    expect(mockGet).toHaveBeenCalledWith("/mapRegions.jsonl", {
      signal: undefined,
      responseType: "text",
    });
  });
});

describe("localisation", () => {
  it("maps ESI's Accept-Language to an SDE language, else English", () => {
    expect(sdeLanguage("de")).toBe("de");
    expect(sdeLanguage("fr-FR")).toBe("fr");
    expect(sdeLanguage("pt")).toBe("en");
    expect(sdeLanguage(undefined)).toBe("en");
  });

  it("resolves only localized fields, falling back to English", () => {
    expect(
      localizeRecord(
        {
          id: 1,
          name: { en: "Rifter", de: "Rifter (de)" },
          description: { en: "A frigate" },
          position: { x: 1, y: 2, z: 3 },
          ids: [1, 2],
        },
        "de",
      ),
    ).toEqual({
      id: 1,
      name: "Rifter (de)",
      description: "A frigate",
      position: { x: 1, y: 2, z: 3 },
      ids: [1, 2],
    });
  });

  it("answers in the reader's language", async () => {
    mockLanguage = "de";
    const { result } = renderHook(() => useSolarSystem(30000142), {
      wrapper,
    });
    await waitFor(() => expect(result.current.data?.name).toBe("Jita (de)"));
  });
});

describe("celestial names", () => {
  it("writes celestial indices in Roman numerals", () => {
    expect([1, 4, 9, 11, 14, 40].map(toRomanNumeral)).toEqual([
      "I",
      "IV",
      "IX",
      "XI",
      "XIV",
      "XL",
    ]);
  });

  it.each([
    ["planet", () => usePlanet(40009082), "Jita IV"],
    ["moon", () => useMoon(40009087), "Jita IV - Moon 4"],
    [
      "asteroid belt",
      () => useAsteroidBelt(40000003),
      "Jita I - Asteroid Belt 1",
    ],
    ["star", () => useStar(40009076), "Jita - Star"],
    // Named after where it leads, not where it is.
    ["stargate", () => useStargate(50001248), "Stargate (Maurasi)"],
  ] as [string, () => { data?: { name?: string } }, string][])(
    "names a %s as EVE does",
    async (_kind, hook, name) => {
      const { result } = renderHook(hook, { wrapper });
      await waitFor(() => expect(result.current.data?.name).toBe(name));
    },
  );

  it("uses a celestial's unique name, without fetching its system", async () => {
    const { result } = renderHook(() => usePlanet(40002444), { wrapper });
    await waitFor(() =>
      expect(result.current.data?.name).toBe("Uplingur IV (Ndoria)"),
    );
    expect(mockGet).not.toHaveBeenCalledWith(
      "/mapSolarSystems/30000142.json",
      expect.anything(),
    );
  });

  it("returns the celestial before its system has loaded", async () => {
    mockGet.mockImplementation((url) =>
      url.startsWith("/mapSolarSystems/")
        ? new Promise(() => undefined)
        : Promise.resolve({ data: RECORDS[url] }),
    );
    const { result } = renderHook(() => usePlanet(40009082), { wrapper });
    await waitFor(() => expect(result.current.data?.typeID).toBe(13));
    expect(result.current.data?.name).toBeUndefined();
  });
});

describe("useRegionIds", () => {
  it("lists every region's id", async () => {
    mockGet.mockResolvedValue({
      data: '{"regionID":10000002}\n{"regionID":11000001}\n',
    });
    const { result } = renderHook(() => useRegionIds(), { wrapper });
    await waitFor(() =>
      expect(result.current.data).toEqual([10000002, 11000001]),
    );
  });
});
