/**
 * Tests for generateMetadata in EVE universe entity pages.
 * These pages query the database (Prisma) using validated integer IDs.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// Mock client components (pull in @tanstack/db ESM dependency chain)
jest.mock("~/app/region/[regionId]/page.client", () => ({ default: () => null }));
jest.mock("~/app/constellation/[constellationId]/page.client", () => ({ default: () => null }));
jest.mock("~/app/system/[systemId]/page.client", () => ({ default: () => null }));
jest.mock("~/app/star/[starId]/page.client", () => ({ default: () => null }));
jest.mock("~/app/planet/[planetId]/page.client", () => ({ default: () => null }));
jest.mock("~/app/station/[stationId]/page.client", () => ({ default: () => null }));
jest.mock("@mantine/core", () => ({ Loader: () => null }));

// ---------------------------------------------------------------------------
// Prisma mock
// ---------------------------------------------------------------------------

const mockRegionFindUnique = jest.fn();
const mockConstellationFindUnique = jest.fn();
const mockSolarSystemFindUnique = jest.fn();
const mockStarFindUnique = jest.fn();
const mockPlanetFindUnique = jest.fn();
const mockStationFindUnique = jest.fn();

jest.mock("~/lib/db", () => ({
  prisma: {
    region: { findUnique: (...a: unknown[]) => mockRegionFindUnique(...a) },
    constellation: { findUnique: (...a: unknown[]) => mockConstellationFindUnique(...a) },
    solarSystem: { findUnique: (...a: unknown[]) => mockSolarSystemFindUnique(...a) },
    star: { findUnique: (...a: unknown[]) => mockStarFindUnique(...a) },
    planet: { findUnique: (...a: unknown[]) => mockPlanetFindUnique(...a) },
    station: { findUnique: (...a: unknown[]) => mockStationFindUnique(...a) },
  },
}));

function rp<T>(obj: T): Promise<T> {
  return Promise.resolve(obj);
}

// ---------------------------------------------------------------------------
// region/[regionId]
// ---------------------------------------------------------------------------

describe("region/[regionId] generateMetadata", () => {
  beforeEach(() => {
    jest.resetModules();
    mockRegionFindUnique.mockReset();
  });

  it("returns region name and description", async () => {
    mockRegionFindUnique.mockResolvedValue({ name: "The Forge", description: "Caldari space." });
    const { generateMetadata } = await import("~/app/region/[regionId]/page");
    const result = await generateMetadata({ params: rp({ regionId: "10000002" }) });
    expect(result.title).toBe("The Forge");
    expect(result.description).toBe("Caldari space.");
  });

  it("falls back to generated description when DB description is null", async () => {
    mockRegionFindUnique.mockResolvedValue({ name: "The Forge", description: null });
    const { generateMetadata } = await import("~/app/region/[regionId]/page");
    const result = await generateMetadata({ params: rp({ regionId: "10000002" }) });
    expect(result.description).toContain("The Forge");
  });

  it("returns empty for id = 0", async () => {
    const { generateMetadata } = await import("~/app/region/[regionId]/page");
    expect(await generateMetadata({ params: rp({ regionId: "0" }) })).toEqual({});
  });

  it("returns empty for non-numeric id", async () => {
    const { generateMetadata } = await import("~/app/region/[regionId]/page");
    expect(await generateMetadata({ params: rp({ regionId: "abc" }) })).toEqual({});
  });

  it("returns empty when region not found", async () => {
    mockRegionFindUnique.mockResolvedValue(null);
    const { generateMetadata } = await import("~/app/region/[regionId]/page");
    expect(await generateMetadata({ params: rp({ regionId: "10000002" }) })).toEqual({});
  });

  it("returns empty when Prisma throws", async () => {
    mockRegionFindUnique.mockRejectedValue(new Error("db"));
    const { generateMetadata } = await import("~/app/region/[regionId]/page");
    expect(await generateMetadata({ params: rp({ regionId: "10000002" }) })).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// constellation/[constellationId]
// ---------------------------------------------------------------------------

describe("constellation/[constellationId] generateMetadata", () => {
  beforeEach(() => {
    jest.resetModules();
    mockConstellationFindUnique.mockReset();
  });

  it("returns constellation name", async () => {
    mockConstellationFindUnique.mockResolvedValue({ name: "Kimotoro" });
    const { generateMetadata } = await import("~/app/constellation/[constellationId]/page");
    const result = await generateMetadata({ params: rp({ constellationId: "20000001" }) });
    expect(result.title).toBe("Kimotoro");
  });

  it("returns empty for Infinity", async () => {
    const { generateMetadata } = await import("~/app/constellation/[constellationId]/page");
    expect(await generateMetadata({ params: rp({ constellationId: "Infinity" }) })).toEqual({});
  });

  it("returns empty when not found", async () => {
    mockConstellationFindUnique.mockResolvedValue(null);
    const { generateMetadata } = await import("~/app/constellation/[constellationId]/page");
    expect(await generateMetadata({ params: rp({ constellationId: "20000001" }) })).toEqual({});
  });

  it("returns empty when Prisma throws", async () => {
    mockConstellationFindUnique.mockRejectedValue(new Error("db"));
    const { generateMetadata } = await import("~/app/constellation/[constellationId]/page");
    expect(await generateMetadata({ params: rp({ constellationId: "20000001" }) })).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// system/[systemId]
// ---------------------------------------------------------------------------

describe("system/[systemId] generateMetadata", () => {
  beforeEach(() => {
    jest.resetModules();
    mockSolarSystemFindUnique.mockReset();
  });

  it("returns system name", async () => {
    mockSolarSystemFindUnique.mockResolvedValue({ name: "Jita" });
    const { generateMetadata } = await import("~/app/system/[systemId]/page");
    const result = await generateMetadata({ params: rp({ systemId: "30000142" }) });
    expect(result.title).toBe("Jita");
  });

  it("returns empty for invalid id", async () => {
    const { generateMetadata } = await import("~/app/system/[systemId]/page");
    expect(await generateMetadata({ params: rp({ systemId: "-5" }) })).toEqual({});
  });

  it("returns empty when not found", async () => {
    mockSolarSystemFindUnique.mockResolvedValue(null);
    const { generateMetadata } = await import("~/app/system/[systemId]/page");
    expect(await generateMetadata({ params: rp({ systemId: "30000142" }) })).toEqual({});
  });

  it("returns empty when Prisma throws", async () => {
    mockSolarSystemFindUnique.mockRejectedValue(new Error("db"));
    const { generateMetadata } = await import("~/app/system/[systemId]/page");
    expect(await generateMetadata({ params: rp({ systemId: "30000142" }) })).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// star/[starId]
// ---------------------------------------------------------------------------

describe("star/[starId] generateMetadata", () => {
  beforeEach(() => {
    jest.resetModules();
    mockStarFindUnique.mockReset();
  });

  it("returns star name", async () => {
    mockStarFindUnique.mockResolvedValue({ name: "Jita - Star" });
    const { generateMetadata } = await import("~/app/star/[starId]/page");
    const result = await generateMetadata({ params: rp({ starId: "40009077" }) });
    expect(result.title).toBe("Jita - Star");
  });

  it("returns empty for id = 0", async () => {
    const { generateMetadata } = await import("~/app/star/[starId]/page");
    expect(await generateMetadata({ params: rp({ starId: "0" }) })).toEqual({});
  });

  it("returns empty when not found", async () => {
    mockStarFindUnique.mockResolvedValue(null);
    const { generateMetadata } = await import("~/app/star/[starId]/page");
    expect(await generateMetadata({ params: rp({ starId: "40009077" }) })).toEqual({});
  });

  it("returns empty when Prisma throws", async () => {
    mockStarFindUnique.mockRejectedValue(new Error("db"));
    const { generateMetadata } = await import("~/app/star/[starId]/page");
    expect(await generateMetadata({ params: rp({ starId: "40009077" }) })).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// planet/[planetId]
// ---------------------------------------------------------------------------

describe("planet/[planetId] generateMetadata", () => {
  beforeEach(() => {
    jest.resetModules();
    mockPlanetFindUnique.mockReset();
  });

  it("returns planet name", async () => {
    mockPlanetFindUnique.mockResolvedValue({ name: "Jita IV" });
    const { generateMetadata } = await import("~/app/planet/[planetId]/page");
    const result = await generateMetadata({ params: rp({ planetId: "40009081" }) });
    expect(result.title).toBe("Jita IV");
  });

  it("returns empty for non-numeric id", async () => {
    const { generateMetadata } = await import("~/app/planet/[planetId]/page");
    expect(await generateMetadata({ params: rp({ planetId: "xyz" }) })).toEqual({});
  });

  it("returns empty when not found", async () => {
    mockPlanetFindUnique.mockResolvedValue(null);
    const { generateMetadata } = await import("~/app/planet/[planetId]/page");
    expect(await generateMetadata({ params: rp({ planetId: "40009081" }) })).toEqual({});
  });

  it("returns empty when Prisma throws", async () => {
    mockPlanetFindUnique.mockRejectedValue(new Error("db"));
    const { generateMetadata } = await import("~/app/planet/[planetId]/page");
    expect(await generateMetadata({ params: rp({ planetId: "40009081" }) })).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// station/[stationId]
// ---------------------------------------------------------------------------

describe("station/[stationId] generateMetadata", () => {
  beforeEach(() => {
    jest.resetModules();
    mockStationFindUnique.mockReset();
  });

  it("returns station name", async () => {
    mockStationFindUnique.mockResolvedValue({ name: "Jita IV - Moon 4 - Caldari Navy Assembly Plant" });
    const { generateMetadata } = await import("~/app/station/[stationId]/page");
    const result = await generateMetadata({ params: rp({ stationId: "60003760" }) });
    expect(result.title).toBe("Jita IV - Moon 4 - Caldari Navy Assembly Plant");
  });

  it("returns empty for id = 0", async () => {
    const { generateMetadata } = await import("~/app/station/[stationId]/page");
    expect(await generateMetadata({ params: rp({ stationId: "0" }) })).toEqual({});
  });

  it("returns empty when not found", async () => {
    mockStationFindUnique.mockResolvedValue(null);
    const { generateMetadata } = await import("~/app/station/[stationId]/page");
    expect(await generateMetadata({ params: rp({ stationId: "60003760" }) })).toEqual({});
  });

  it("returns empty when Prisma throws", async () => {
    mockStationFindUnique.mockRejectedValue(new Error("db"));
    const { generateMetadata } = await import("~/app/station/[stationId]/page");
    expect(await generateMetadata({ params: rp({ stationId: "60003760" }) })).toEqual({});
  });
});
