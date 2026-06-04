/**
 * Tests for generateMetadata in EVE universe entity pages.
 * These pages fetch names from the ESI API using validated integer IDs.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

// Mock client components (pull in @tanstack/db ESM dependency chain)
jest.mock("~/app/region/[regionId]/page.client", () => ({ default: () => null }));
jest.mock("~/app/constellation/[constellationId]/page.client", () => ({ default: () => null }));
jest.mock("~/app/system/[systemId]/page.client", () => ({ default: () => null }));
jest.mock("~/app/star/[starId]/page.client", () => ({ default: () => null }));
jest.mock("~/app/planet/[planetId]/page.client", () => ({ default: () => null }));
jest.mock("~/app/station/[stationId]/page.client", () => ({ default: () => null }));
jest.mock("@mantine/core", () => ({ Loader: () => null }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetchOk(body: unknown) {
  return jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
  });
}
function mockFetchFail() {
  return jest.fn().mockResolvedValue({ ok: false });
}
function mockFetchThrow() {
  return jest.fn().mockRejectedValue(new Error("net"));
}
function rp<T>(obj: T): Promise<T> {
  return Promise.resolve(obj);
}

// ---------------------------------------------------------------------------
// region/[regionId]
// ---------------------------------------------------------------------------

describe("region/[regionId] generateMetadata", () => {
  beforeEach(() => jest.resetModules());
  afterEach(() => { (global as Record<string, unknown>).fetch = undefined; });

  it("returns region name for a valid id", async () => {
    (global as Record<string, unknown>).fetch = mockFetchOk({ name: "The Forge" });
    const { generateMetadata } = await import("~/app/region/[regionId]/page");
    const result = await generateMetadata({ params: rp({ regionId: "10000002" }) });
    expect(result.title).toBe("The Forge");
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

  it("returns empty when ESI is non-ok", async () => {
    (global as Record<string, unknown>).fetch = mockFetchFail();
    const { generateMetadata } = await import("~/app/region/[regionId]/page");
    expect(await generateMetadata({ params: rp({ regionId: "10000002" }) })).toEqual({});
  });

  it("returns empty when fetch throws", async () => {
    (global as Record<string, unknown>).fetch = mockFetchThrow();
    const { generateMetadata } = await import("~/app/region/[regionId]/page");
    expect(await generateMetadata({ params: rp({ regionId: "10000002" }) })).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// constellation/[constellationId]
// ---------------------------------------------------------------------------

describe("constellation/[constellationId] generateMetadata", () => {
  beforeEach(() => jest.resetModules());
  afterEach(() => { (global as Record<string, unknown>).fetch = undefined; });

  it("returns constellation name for a valid id", async () => {
    (global as Record<string, unknown>).fetch = mockFetchOk({ name: "Kimotoro" });
    const { generateMetadata } = await import("~/app/constellation/[constellationId]/page");
    const result = await generateMetadata({ params: rp({ constellationId: "20000001" }) });
    expect(result.title).toBe("Kimotoro");
  });

  it("returns empty for Infinity", async () => {
    const { generateMetadata } = await import("~/app/constellation/[constellationId]/page");
    expect(await generateMetadata({ params: rp({ constellationId: "Infinity" }) })).toEqual({});
  });

  it("returns empty when ESI is non-ok", async () => {
    (global as Record<string, unknown>).fetch = mockFetchFail();
    const { generateMetadata } = await import("~/app/constellation/[constellationId]/page");
    expect(await generateMetadata({ params: rp({ constellationId: "20000001" }) })).toEqual({});
  });

  it("returns empty when fetch throws", async () => {
    (global as Record<string, unknown>).fetch = mockFetchThrow();
    const { generateMetadata } = await import("~/app/constellation/[constellationId]/page");
    expect(await generateMetadata({ params: rp({ constellationId: "20000001" }) })).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// system/[systemId]
// ---------------------------------------------------------------------------

describe("system/[systemId] generateMetadata", () => {
  beforeEach(() => jest.resetModules());
  afterEach(() => { (global as Record<string, unknown>).fetch = undefined; });

  it("returns system name for a valid id", async () => {
    (global as Record<string, unknown>).fetch = mockFetchOk({ name: "Jita" });
    const { generateMetadata } = await import("~/app/system/[systemId]/page");
    const result = await generateMetadata({ params: rp({ systemId: "30000142" }) });
    expect(result.title).toBe("Jita");
  });

  it("returns empty for invalid id", async () => {
    const { generateMetadata } = await import("~/app/system/[systemId]/page");
    expect(await generateMetadata({ params: rp({ systemId: "-5" }) })).toEqual({});
  });

  it("returns empty when ESI is non-ok", async () => {
    (global as Record<string, unknown>).fetch = mockFetchFail();
    const { generateMetadata } = await import("~/app/system/[systemId]/page");
    expect(await generateMetadata({ params: rp({ systemId: "30000142" }) })).toEqual({});
  });

  it("returns empty when fetch throws", async () => {
    (global as Record<string, unknown>).fetch = mockFetchThrow();
    const { generateMetadata } = await import("~/app/system/[systemId]/page");
    expect(await generateMetadata({ params: rp({ systemId: "30000142" }) })).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// star/[starId]
// ---------------------------------------------------------------------------

describe("star/[starId] generateMetadata", () => {
  beforeEach(() => jest.resetModules());
  afterEach(() => { (global as Record<string, unknown>).fetch = undefined; });

  it("returns star name for a valid id", async () => {
    (global as Record<string, unknown>).fetch = mockFetchOk({ name: "Jita - Star" });
    const { generateMetadata } = await import("~/app/star/[starId]/page");
    const result = await generateMetadata({ params: rp({ starId: "40009077" }) });
    expect(result.title).toBe("Jita - Star");
  });

  it("returns empty for invalid id", async () => {
    const { generateMetadata } = await import("~/app/star/[starId]/page");
    expect(await generateMetadata({ params: rp({ starId: "0" }) })).toEqual({});
  });

  it("returns empty when ESI is non-ok", async () => {
    (global as Record<string, unknown>).fetch = mockFetchFail();
    const { generateMetadata } = await import("~/app/star/[starId]/page");
    expect(await generateMetadata({ params: rp({ starId: "40009077" }) })).toEqual({});
  });

  it("returns empty when fetch throws", async () => {
    (global as Record<string, unknown>).fetch = mockFetchThrow();
    const { generateMetadata } = await import("~/app/star/[starId]/page");
    expect(await generateMetadata({ params: rp({ starId: "40009077" }) })).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// planet/[planetId]
// ---------------------------------------------------------------------------

describe("planet/[planetId] generateMetadata", () => {
  beforeEach(() => jest.resetModules());
  afterEach(() => { (global as Record<string, unknown>).fetch = undefined; });

  it("returns planet name for a valid id", async () => {
    (global as Record<string, unknown>).fetch = mockFetchOk({ name: "Jita IV" });
    const { generateMetadata } = await import("~/app/planet/[planetId]/page");
    const result = await generateMetadata({ params: rp({ planetId: "40009081" }) });
    expect(result.title).toBe("Jita IV");
  });

  it("returns empty for non-numeric id", async () => {
    const { generateMetadata } = await import("~/app/planet/[planetId]/page");
    expect(await generateMetadata({ params: rp({ planetId: "xyz" }) })).toEqual({});
  });

  it("returns empty when ESI is non-ok", async () => {
    (global as Record<string, unknown>).fetch = mockFetchFail();
    const { generateMetadata } = await import("~/app/planet/[planetId]/page");
    expect(await generateMetadata({ params: rp({ planetId: "40009081" }) })).toEqual({});
  });

  it("returns empty when fetch throws", async () => {
    (global as Record<string, unknown>).fetch = mockFetchThrow();
    const { generateMetadata } = await import("~/app/planet/[planetId]/page");
    expect(await generateMetadata({ params: rp({ planetId: "40009081" }) })).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// station/[stationId]
// ---------------------------------------------------------------------------

describe("station/[stationId] generateMetadata", () => {
  beforeEach(() => jest.resetModules());
  afterEach(() => { (global as Record<string, unknown>).fetch = undefined; });

  it("returns station name for a valid id", async () => {
    (global as Record<string, unknown>).fetch = mockFetchOk({ name: "Jita IV - Moon 4 - Caldari Navy Assembly Plant" });
    const { generateMetadata } = await import("~/app/station/[stationId]/page");
    const result = await generateMetadata({ params: rp({ stationId: "60003760" }) });
    expect(result.title).toBe("Jita IV - Moon 4 - Caldari Navy Assembly Plant");
  });

  it("returns empty for id = 0", async () => {
    const { generateMetadata } = await import("~/app/station/[stationId]/page");
    expect(await generateMetadata({ params: rp({ stationId: "0" }) })).toEqual({});
  });

  it("returns empty when ESI is non-ok", async () => {
    (global as Record<string, unknown>).fetch = mockFetchFail();
    const { generateMetadata } = await import("~/app/station/[stationId]/page");
    expect(await generateMetadata({ params: rp({ stationId: "60003760" }) })).toEqual({});
  });

  it("returns empty when fetch throws", async () => {
    (global as Record<string, unknown>).fetch = mockFetchThrow();
    const { generateMetadata } = await import("~/app/station/[stationId]/page");
    expect(await generateMetadata({ params: rp({ stationId: "60003760" }) })).toEqual({});
  });
});
