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
jest.mock("~/app/bloodline/[bloodlineId]/page.client", () => ({
  default: () => null,
}));
jest.mock("~/app/faction/[factionId]/page.client", () => ({
  default: () => null,
}));
jest.mock("~/app/kill/[killId]/page.client", () => ({ default: () => null }));
jest.mock("~/app/war/[warId]/page.client", () => ({ default: () => null }));
jest.mock("~/app/dogma/attribute/[attributeId]/page.client", () => ({
  default: () => null,
}));
jest.mock("~/app/dogma/effect/[effectId]/page.client", () => ({
  default: () => null,
}));
jest.mock("~/app/lp-store/[corporationId]/page.client", () => ({
  default: () => null,
}));

// next/cache — make cacheLife a no-op so "use cache" functions run in tests
jest.mock("next/cache", () => ({ cacheLife: jest.fn() }));

// ESI mock. The war page resolves its two sides through ESI; without this the
// suite makes real network calls (and its assertions depend on live game state).
const mockGetWarsWarId = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetCorporationsCorporationId =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetAlliancesAllianceId =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetKillmail = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock("@jitaspace/esi-client", () => ({
  getWarsWarId: (...a: unknown[]) => mockGetWarsWarId(...a),
  getCorporationsCorporationId: (...a: unknown[]) =>
    mockGetCorporationsCorporationId(...a),
  getAlliancesAllianceId: (...a: unknown[]) => mockGetAlliancesAllianceId(...a),
  getKillmailsKillmailIdKillmailHash: (...a: unknown[]) =>
    mockGetKillmail(...a),
}));

// Prisma mock — methods are replaced per describe block
const mockRaceFindUnique = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockBloodlineFindUnique =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockFactionFindUnique =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockDogmaAttributeFindUnique =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockDogmaEffectFindUnique =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockCorporationFindUnique =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockLoyaltyStoreOfferCount =
  jest.fn<(...args: unknown[]) => Promise<number>>();

jest.mock("~/lib/db", () => ({
  prisma: {
    race: { findUnique: (...a: unknown[]) => mockRaceFindUnique(...a) },
    bloodline: {
      findUnique: (...a: unknown[]) => mockBloodlineFindUnique(...a),
    },
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
    loyaltyStoreOffer: {
      count: (...a: unknown[]) => mockLoyaltyStoreOfferCount(...a),
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
    mockRaceFindUnique.mockResolvedValue({
      name: "Caldari",
      description: "Industrialists.",
    });
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
    expect(await generateMetadata({ params: rp({ raceId: "bad" }) })).toEqual(
      {},
    );
  });

  it("returns empty when Prisma throws", async () => {
    mockRaceFindUnique.mockRejectedValue(new Error("db error"));
    const { generateMetadata } = await import("~/app/race/[raceId]/page");
    expect(await generateMetadata({ params: rp({ raceId: "1" }) })).toEqual({});
  });

  it("truncates long description to 200 chars", async () => {
    mockRaceFindUnique.mockResolvedValue({
      name: "Caldari",
      description: "x".repeat(300),
    });
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
    mockBloodlineFindUnique.mockResolvedValue({
      name: "Deteis",
      description: "Detail-oriented.",
      shipTypeId: 601,
      race: { name: "Caldari" },
      corporation: { name: "Science and Trade Institute" },
    });
    const { generateMetadata } =
      await import("~/app/bloodline/[bloodlineId]/page");
    const result = await generateMetadata({ params: rp({ bloodlineId: "1" }) });
    expect(result.title).toBe("Deteis");
    expect(result.description).toBe("Detail-oriented.");
  });

  it("returns empty when bloodline not found", async () => {
    mockBloodlineFindUnique.mockResolvedValue(null);
    const { generateMetadata } =
      await import("~/app/bloodline/[bloodlineId]/page");
    expect(
      await generateMetadata({ params: rp({ bloodlineId: "999" }) }),
    ).toEqual({});
  });

  it("returns empty for invalid id", async () => {
    const { generateMetadata } =
      await import("~/app/bloodline/[bloodlineId]/page");
    expect(
      await generateMetadata({ params: rp({ bloodlineId: "-1" }) }),
    ).toEqual({});
  });

  it("returns empty when Prisma throws", async () => {
    mockBloodlineFindUnique.mockRejectedValue(new Error("db"));
    const { generateMetadata } =
      await import("~/app/bloodline/[bloodlineId]/page");
    expect(
      await generateMetadata({ params: rp({ bloodlineId: "1" }) }),
    ).toEqual({});
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
      corporationId: 1000035,
      stationCount: 419,
      militiaCorporation: { name: "State Protectorate" },
    });
    const { generateMetadata } = await import("~/app/faction/[factionId]/page");
    const result = await generateMetadata({
      params: rp({ factionId: "500001" }),
    });
    expect(result.title).toBe("Caldari State");
    expect(result.description).toBe("Corporate megastate.");
  });

  it("returns empty when faction not found", async () => {
    mockFactionFindUnique.mockResolvedValue(null);
    const { generateMetadata } = await import("~/app/faction/[factionId]/page");
    expect(
      await generateMetadata({ params: rp({ factionId: "9999" }) }),
    ).toEqual({});
  });

  it("returns empty for id = 0", async () => {
    const { generateMetadata } = await import("~/app/faction/[factionId]/page");
    expect(await generateMetadata({ params: rp({ factionId: "0" }) })).toEqual(
      {},
    );
  });

  it("returns empty when Prisma throws", async () => {
    mockFactionFindUnique.mockRejectedValue(new Error("db"));
    const { generateMetadata } = await import("~/app/faction/[factionId]/page");
    expect(
      await generateMetadata({ params: rp({ factionId: "500001" }) }),
    ).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// kill/[killId] — static metadata with ID interpolation
// ---------------------------------------------------------------------------

describe("kill/[killId] generateMetadata", () => {
  beforeEach(() => {
    jest.resetModules();
  });

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
    expect(await generateMetadata({ params: rp({ killId: "abc" }) })).toEqual(
      {},
    );
  });

  it("returns empty for negative id", async () => {
    const { generateMetadata } = await import("~/app/kill/[killId]/page");
    expect(await generateMetadata({ params: rp({ killId: "-99" }) })).toEqual(
      {},
    );
  });
});

// ---------------------------------------------------------------------------
// war/[warId] — static metadata with ID interpolation
// ---------------------------------------------------------------------------

describe("war/[warId] generateMetadata", () => {
  beforeEach(() => {
    jest.resetModules();
    mockGetWarsWarId.mockReset();
    mockGetCorporationsCorporationId.mockReset();
    mockGetAlliancesAllianceId.mockReset();
  });

  it("names both sides when ESI resolves them", async () => {
    mockGetWarsWarId.mockResolvedValue({
      data: {
        aggressor: {
          corporation_id: 98000001,
          ships_killed: 3,
          isk_destroyed: 0,
        },
        defender: { alliance_id: 99005338, ships_killed: 1, isk_destroyed: 0 },
        declared: "2026-01-02T03:04:05Z",
        mutual: false,
        open_for_allies: true,
      },
    });
    mockGetCorporationsCorporationId.mockResolvedValue({
      data: { name: "Aggressor Corp" },
    });
    mockGetAlliancesAllianceId.mockResolvedValue({
      data: { name: "Defender Alliance" },
    });

    const { generateMetadata } = await import("~/app/war/[warId]/page");
    const result = await generateMetadata({ params: rp({ warId: "7777" }) });
    expect(result.title).toBe("Aggressor Corp vs Defender Alliance");
    expect(result.description).toContain("2026-01-02");
    expect(result.openGraph?.title).toBe("Aggressor Corp vs Defender Alliance");
  });

  it("falls back to the war number when ESI is unavailable", async () => {
    mockGetWarsWarId.mockRejectedValue(new Error("esi down"));
    const { generateMetadata } = await import("~/app/war/[warId]/page");
    const result = await generateMetadata({ params: rp({ warId: "7777" }) });
    expect(result.title).toBe("War #7777");
    expect(result.description).toContain("7777");
  });

  it("falls back to the war number when a side cannot be named", async () => {
    mockGetWarsWarId.mockResolvedValue({
      data: {
        aggressor: {
          corporation_id: 98000001,
          ships_killed: 0,
          isk_destroyed: 0,
        },
        defender: { alliance_id: 99005338, ships_killed: 0, isk_destroyed: 0 },
        declared: "2026-01-02T03:04:05Z",
        mutual: false,
        open_for_allies: true,
      },
    });
    mockGetCorporationsCorporationId.mockResolvedValue({
      data: { name: "Aggressor Corp" },
    });
    mockGetAlliancesAllianceId.mockRejectedValue(new Error("nope"));

    const { generateMetadata } = await import("~/app/war/[warId]/page");
    const result = await generateMetadata({ params: rp({ warId: "7777" }) });
    expect(result.title).toBe("War #7777");
  });

  it("returns empty for id = 0", async () => {
    const { generateMetadata } = await import("~/app/war/[warId]/page");
    expect(await generateMetadata({ params: rp({ warId: "0" }) })).toEqual({});
  });

  it("returns empty for Infinity", async () => {
    const { generateMetadata } = await import("~/app/war/[warId]/page");
    expect(
      await generateMetadata({ params: rp({ warId: "Infinity" }) }),
    ).toEqual({});
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
    const { generateMetadata } =
      await import("~/app/dogma/attribute/[attributeId]/page");
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
    const { generateMetadata } =
      await import("~/app/dogma/attribute/[attributeId]/page");
    const result = await generateMetadata({ params: rp({ attributeId: "4" }) });
    expect(result.title).toBe("mass");
  });

  it("returns empty for id = 0", async () => {
    const { generateMetadata } =
      await import("~/app/dogma/attribute/[attributeId]/page");
    expect(
      await generateMetadata({ params: rp({ attributeId: "0" }) }),
    ).toEqual({});
  });

  it("returns empty when Prisma throws", async () => {
    mockDogmaAttributeFindUnique.mockRejectedValue(new Error("db"));
    const { generateMetadata } =
      await import("~/app/dogma/attribute/[attributeId]/page");
    expect(
      await generateMetadata({ params: rp({ attributeId: "4" }) }),
    ).toEqual({});
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
    const { generateMetadata } =
      await import("~/app/dogma/effect/[effectId]/page");
    const result = await generateMetadata({ params: rp({ effectId: "16" }) });
    expect(result.title).toBe("High Power Slot");
    expect(result.description).toBe("Fitted in a high power slot.");
  });

  it("returns empty for invalid id", async () => {
    const { generateMetadata } =
      await import("~/app/dogma/effect/[effectId]/page");
    expect(await generateMetadata({ params: rp({ effectId: "abc" }) })).toEqual(
      {},
    );
  });

  it("returns empty when Prisma throws", async () => {
    mockDogmaEffectFindUnique.mockRejectedValue(new Error("db"));
    const { generateMetadata } =
      await import("~/app/dogma/effect/[effectId]/page");
    expect(await generateMetadata({ params: rp({ effectId: "16" }) })).toEqual(
      {},
    );
  });
});

// ---------------------------------------------------------------------------
// lp-store/[corporationId]
// ---------------------------------------------------------------------------

describe("lp-store/[corporationId] generateMetadata", () => {
  beforeEach(() => {
    jest.resetModules();
    mockCorporationFindUnique.mockReset();
    mockLoyaltyStoreOfferCount.mockReset();
    mockLoyaltyStoreOfferCount.mockResolvedValue(0);
  });

  it("returns corporation LP store title", async () => {
    mockCorporationFindUnique.mockResolvedValue({
      corporationId: 1000035,
      name: "Caldari Navy",
      ticker: "CN",
      loyaltyStoreOffers: [],
    });
    mockLoyaltyStoreOfferCount.mockResolvedValue(42);
    const { generateMetadata } =
      await import("~/app/lp-store/[corporationId]/page");
    const result = await generateMetadata({
      params: rp({ corporationId: "1000035" }),
    });
    expect(result.title).toBe("Caldari Navy LP Store");
    expect(result.description).toContain("Caldari Navy");
  });

  it("returns empty when corporation not found", async () => {
    // An unknown corporation has no LP store page to describe, so there is
    // nothing to unfurl — the page itself 404s.
    mockCorporationFindUnique.mockResolvedValue(null);
    const { generateMetadata } =
      await import("~/app/lp-store/[corporationId]/page");
    expect(
      await generateMetadata({ params: rp({ corporationId: "1000035" }) }),
    ).toEqual({});
  });

  it("returns empty for id = 0", async () => {
    const { generateMetadata } =
      await import("~/app/lp-store/[corporationId]/page");
    expect(
      await generateMetadata({ params: rp({ corporationId: "0" }) }),
    ).toEqual({});
  });

  it("returns empty when Prisma throws", async () => {
    mockCorporationFindUnique.mockRejectedValue(new Error("db"));
    const { generateMetadata } =
      await import("~/app/lp-store/[corporationId]/page");
    expect(
      await generateMetadata({ params: rp({ corporationId: "1000035" }) }),
    ).toEqual({});
  });
});
