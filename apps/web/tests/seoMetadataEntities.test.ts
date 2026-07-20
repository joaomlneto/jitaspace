/**
 * Tests for generateMetadata in:
 *  - Prisma-backed lore pages (race, bloodline, faction)
 *  - Static ID pages (kill, war)
 *  - DB-cached dynamic pages (dogma/attribute, dogma/effect, lp-store/[corp])
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// ---------------------------------------------------------------------------
// Module mocks (hoisted before any imports)
// ---------------------------------------------------------------------------

jest.mock("@mantine/core", () => ({ Loader: () => null }));

// Client component stubs
jest.mock("~/app/race/[raceId]/page.client", () => ({ default: () => null }));
jest.mock("~/app/bloodline/[bloodlineId]/page.client", () => ({ default: () => null }));
jest.mock("~/app/faction/[factionId]/page.client", () => ({ default: () => null }));
jest.mock("~/app/kill/[killId]/page.client", () => ({ default: () => null }));
jest.mock("~/app/war/[warId]/page.client", () => ({ default: () => null }));
jest.mock("~/app/dogma/attribute/[attributeId]/page.client", () => ({
  default: () => null,
}));
jest.mock("~/app/dogma/effect/[effectId]/page.client", () => ({ default: () => null }));
jest.mock("~/app/lp-store/[corporationId]/page.client", () => ({ default: () => null }));

// next/cache — make cacheLife a no-op so "use cache" functions run in tests
jest.mock("next/cache", () => ({ cacheLife: jest.fn() }));

// Prisma mock — methods are replaced per describe block
const mockRaceFindUnique = jest.fn();
const mockBloodlineFindUnique = jest.fn();
const mockFactionFindUnique = jest.fn();
const mockDogmaAttributeFindUnique = jest.fn();
const mockDogmaEffectFindUnique = jest.fn();
const mockCorporationFindUnique = jest.fn();

jest.mock("~/lib/db", () => ({
  prisma: {
    race: { findUnique: (...a: unknown[]) => mockRaceFindUnique(...a) },
    bloodline: { findUnique: (...a: unknown[]) => mockBloodlineFindUnique(...a) },
    faction: { findUnique: (...a: unknown[]) => mockFactionFindUnique(...a) },
    dogmaAttribute: {
      findUnique: (...a: unknown[]) => mockDogmaAttributeFindUnique(...a),
    },
    dogmaEffect: {
      findUnique: (...a: unknown[]) => mockDogmaEffectFindUnique(...a),
    },
    corporation: {
      findUnique: (...a: unknown[]) => mockCorporationFindUnique(...a),
    },
  },
}));

function rp<T>(obj: T): Promise<T> {
  return Promise.resolve(obj);
}

// ---------------------------------------------------------------------------
// race/[raceId]
// ---------------------------------------------------------------------------

describe("race/[raceId] generateMetadata", () => {
  beforeEach(() => {
    jest.resetModules();
    mockRaceFindUnique.mockReset();
  });

  it("returns race name and description", async () => {
    mockRaceFindUnique.mockResolvedValue({ name: "Caldari", description: "Industrialists." });
    const { generateMetadata } = await import("~/app/race/[raceId]/page");
    const result = await generateMetadata({ params: rp({ raceId: "1" }) });
    expect(result.title).toBe("Caldari");
    expect(result.description).toBe("Industrialists.");
  });

  it("returns empty when race not found", async () => {
    mockRaceFindUnique.mockResolvedValue(null);
    const { generateMetadata } = await import("~/app/race/[raceId]/page");
    const result = await generateMetadata({ params: rp({ raceId: "999" }) });
    expect(result).toEqual({});
  });

  it("returns empty for id = 0", async () => {
    const { generateMetadata } = await import("~/app/race/[raceId]/page");
    expect(await generateMetadata({ params: rp({ raceId: "0" }) })).toEqual({});
  });

  it("returns empty for non-numeric id", async () => {
    const { generateMetadata } = await import("~/app/race/[raceId]/page");
    expect(await generateMetadata({ params: rp({ raceId: "bad" }) })).toEqual({});
  });

  it("returns empty when Prisma throws", async () => {
    mockRaceFindUnique.mockRejectedValue(new Error("db error"));
    const { generateMetadata } = await import("~/app/race/[raceId]/page");
    expect(await generateMetadata({ params: rp({ raceId: "1" }) })).toEqual({});
  });

  it("truncates long description to 200 chars", async () => {
    mockRaceFindUnique.mockResolvedValue({ name: "Caldari", description: "x".repeat(300) });
    const { generateMetadata } = await import("~/app/race/[raceId]/page");
    const result = await generateMetadata({ params: rp({ raceId: "1" }) });
    expect((result.description ?? "").length).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// bloodline/[bloodlineId]
// ---------------------------------------------------------------------------

describe("bloodline/[bloodlineId] generateMetadata", () => {
  beforeEach(() => {
    jest.resetModules();
    mockBloodlineFindUnique.mockReset();
  });

  it("returns bloodline name and description", async () => {
    mockBloodlineFindUnique.mockResolvedValue({ name: "Deteis", description: "Detail-oriented." });
    const { generateMetadata } = await import("~/app/bloodline/[bloodlineId]/page");
    const result = await generateMetadata({ params: rp({ bloodlineId: "1" }) });
    expect(result.title).toBe("Deteis");
    expect(result.description).toBe("Detail-oriented.");
  });

  it("returns empty when bloodline not found", async () => {
    mockBloodlineFindUnique.mockResolvedValue(null);
    const { generateMetadata } = await import("~/app/bloodline/[bloodlineId]/page");
    expect(await generateMetadata({ params: rp({ bloodlineId: "999" }) })).toEqual({});
  });

  it("returns empty for invalid id", async () => {
    const { generateMetadata } = await import("~/app/bloodline/[bloodlineId]/page");
    expect(await generateMetadata({ params: rp({ bloodlineId: "-1" }) })).toEqual({});
  });

  it("returns empty when Prisma throws", async () => {
    mockBloodlineFindUnique.mockRejectedValue(new Error("db"));
    const { generateMetadata } = await import("~/app/bloodline/[bloodlineId]/page");
    expect(await generateMetadata({ params: rp({ bloodlineId: "1" }) })).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// faction/[factionId]
// ---------------------------------------------------------------------------

describe("faction/[factionId] generateMetadata", () => {
  beforeEach(() => {
    jest.resetModules();
    mockFactionFindUnique.mockReset();
  });

  it("returns faction name and description", async () => {
    mockFactionFindUnique.mockResolvedValue({
      name: "Caldari State",
      description: "Corporate megastate.",
    });
    const { generateMetadata } = await import("~/app/faction/[factionId]/page");
    const result = await generateMetadata({ params: rp({ factionId: "500001" }) });
    expect(result.title).toBe("Caldari State");
    expect(result.description).toBe("Corporate megastate.");
  });

  it("returns empty when faction not found", async () => {
    mockFactionFindUnique.mockResolvedValue(null);
    const { generateMetadata } = await import("~/app/faction/[factionId]/page");
    expect(await generateMetadata({ params: rp({ factionId: "9999" }) })).toEqual({});
  });

  it("returns empty for id = 0", async () => {
    const { generateMetadata } = await import("~/app/faction/[factionId]/page");
    expect(await generateMetadata({ params: rp({ factionId: "0" }) })).toEqual({});
  });

  it("returns empty when Prisma throws", async () => {
    mockFactionFindUnique.mockRejectedValue(new Error("db"));
    const { generateMetadata } = await import("~/app/faction/[factionId]/page");
    expect(await generateMetadata({ params: rp({ factionId: "500001" }) })).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// kill/[killId] — static metadata with ID interpolation
// ---------------------------------------------------------------------------

describe("kill/[killId] generateMetadata", () => {
  beforeEach(() => jest.resetModules());

  it("returns killmail title for valid id", async () => {
    const { generateMetadata } = await import("~/app/kill/[killId]/page");
    const result = await generateMetadata({ params: rp({ killId: "12345" }) });
    expect(result.title).toBe("Killmail #12345");
    expect(result.description).toContain("12345");
  });

  it("returns empty for id = 0", async () => {
    const { generateMetadata } = await import("~/app/kill/[killId]/page");
    expect(await generateMetadata({ params: rp({ killId: "0" }) })).toEqual({});
  });

  it("returns empty for non-numeric id", async () => {
    const { generateMetadata } = await import("~/app/kill/[killId]/page");
    expect(await generateMetadata({ params: rp({ killId: "abc" }) })).toEqual({});
  });

  it("returns empty for negative id", async () => {
    const { generateMetadata } = await import("~/app/kill/[killId]/page");
    expect(await generateMetadata({ params: rp({ killId: "-99" }) })).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// war/[warId] — static metadata with ID interpolation
// ---------------------------------------------------------------------------

describe("war/[warId] generateMetadata", () => {
  beforeEach(() => jest.resetModules());

  it("returns war title for valid id", async () => {
    const { generateMetadata } = await import("~/app/war/[warId]/page");
    const result = await generateMetadata({ params: rp({ warId: "7777" }) });
    expect(result.title).toBe("War #7777");
    expect(result.description).toContain("7777");
  });

  it("returns empty for id = 0", async () => {
    const { generateMetadata } = await import("~/app/war/[warId]/page");
    expect(await generateMetadata({ params: rp({ warId: "0" }) })).toEqual({});
  });

  it("returns empty for Infinity", async () => {
    const { generateMetadata } = await import("~/app/war/[warId]/page");
    expect(await generateMetadata({ params: rp({ warId: "Infinity" }) })).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// dogma/attribute/[attributeId]
// ---------------------------------------------------------------------------

describe("dogma/attribute/[attributeId] generateMetadata", () => {
  beforeEach(() => {
    jest.resetModules();
    mockDogmaAttributeFindUnique.mockReset();
  });

  it("prefers displayName over name", async () => {
    mockDogmaAttributeFindUnique.mockResolvedValue({
      attributeId: 4,
      name: "mass",
      displayName: "Mass",
      description: "The mass of the object.",
      defaultValue: null,
      highIsGood: null,
      published: true,
      stackable: null,
      unitId: null,
      DogmaUnit: null,
      TypeAttribute: [],
    });
    const { generateMetadata } = await import("~/app/dogma/attribute/[attributeId]/page");
    const result = await generateMetadata({ params: rp({ attributeId: "4" }) });
    expect(result.title).toBe("Mass");
    expect(result.description).toBe("The mass of the object.");
  });

  it("falls back to name when displayName is null", async () => {
    mockDogmaAttributeFindUnique.mockResolvedValue({
      attributeId: 4,
      name: "mass",
      displayName: null,
      description: null,
      defaultValue: null,
      highIsGood: null,
      published: true,
      stackable: null,
      unitId: null,
      DogmaUnit: null,
      TypeAttribute: [],
    });
    const { generateMetadata } = await import("~/app/dogma/attribute/[attributeId]/page");
    const result = await generateMetadata({ params: rp({ attributeId: "4" }) });
    expect(result.title).toBe("mass");
  });

  it("returns empty for id = 0", async () => {
    const { generateMetadata } = await import("~/app/dogma/attribute/[attributeId]/page");
    expect(await generateMetadata({ params: rp({ attributeId: "0" }) })).toEqual({});
  });

  it("returns empty when Prisma throws", async () => {
    mockDogmaAttributeFindUnique.mockRejectedValue(new Error("db"));
    const { generateMetadata } = await import("~/app/dogma/attribute/[attributeId]/page");
    expect(await generateMetadata({ params: rp({ attributeId: "4" }) })).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// dogma/effect/[effectId]
// ---------------------------------------------------------------------------

describe("dogma/effect/[effectId] generateMetadata", () => {
  beforeEach(() => {
    jest.resetModules();
    mockDogmaEffectFindUnique.mockReset();
  });

  it("returns effect title and description", async () => {
    mockDogmaEffectFindUnique.mockResolvedValue({
      effectId: 16,
      name: "hiPower",
      displayName: "High Power Slot",
      description: "Fitted in a high power slot.",
      published: true,
      TypeEffect: [],
      groups: [],
    });
    const { generateMetadata } = await import("~/app/dogma/effect/[effectId]/page");
    const result = await generateMetadata({ params: rp({ effectId: "16" }) });
    expect(result.title).toBe("High Power Slot");
    expect(result.description).toBe("Fitted in a high power slot.");
  });

  it("returns empty for invalid id", async () => {
    const { generateMetadata } = await import("~/app/dogma/effect/[effectId]/page");
    expect(await generateMetadata({ params: rp({ effectId: "abc" }) })).toEqual({});
  });

  it("returns empty when Prisma throws", async () => {
    mockDogmaEffectFindUnique.mockRejectedValue(new Error("db"));
    const { generateMetadata } = await import("~/app/dogma/effect/[effectId]/page");
    expect(await generateMetadata({ params: rp({ effectId: "16" }) })).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// lp-store/[corporationId]
// ---------------------------------------------------------------------------

describe("lp-store/[corporationId] generateMetadata", () => {
  beforeEach(() => {
    jest.resetModules();
    mockCorporationFindUnique.mockReset();
  });

  it("returns corporation LP store title", async () => {
    mockCorporationFindUnique.mockResolvedValue({
      corporationId: 1000035,
      name: "Caldari Navy",
      loyaltyStoreOffers: [],
    });
    const { generateMetadata } = await import("~/app/lp-store/[corporationId]/page");
    const result = await generateMetadata({ params: rp({ corporationId: "1000035" }) });
    expect(result.title).toBe("Caldari Navy LP Store");
    expect(result.description).toContain("Caldari Navy");
  });

  it("returns generic title when corporation not found", async () => {
    mockCorporationFindUnique.mockResolvedValue(null);
    const { generateMetadata } = await import("~/app/lp-store/[corporationId]/page");
    const result = await generateMetadata({ params: rp({ corporationId: "1000035" }) });
    expect(result.title).toBe("LP Store");
  });

  it("returns empty for id = 0", async () => {
    const { generateMetadata } = await import("~/app/lp-store/[corporationId]/page");
    expect(await generateMetadata({ params: rp({ corporationId: "0" }) })).toEqual({});
  });

  it("returns empty when Prisma throws", async () => {
    mockCorporationFindUnique.mockRejectedValue(new Error("db"));
    const { generateMetadata } = await import("~/app/lp-store/[corporationId]/page");
    expect(await generateMetadata({ params: rp({ corporationId: "1000035" }) })).toEqual({});
  });
});
