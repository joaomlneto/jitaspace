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
const mockGetCharactersDetail =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock("@jitaspace/esi-client", () => ({
  getWarsWarId: (...a: unknown[]) => mockGetWarsWarId(...a),
  getCorporationsCorporationId: (...a: unknown[]) =>
    mockGetCorporationsCorporationId(...a),
  getAlliancesAllianceId: (...a: unknown[]) => mockGetAlliancesAllianceId(...a),
  getKillmailsKillmailIdKillmailHash: (...a: unknown[]) =>
    mockGetKillmail(...a),
  getCharactersDetail: (...a: unknown[]) => mockGetCharactersDetail(...a),
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
const mockTypeFindUnique = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockSolarSystemFindUnique =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

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
    type: { findUnique: (...a: unknown[]) => mockTypeFindUnique(...a) },
    solarSystem: {
      findUnique: (...a: unknown[]) => mockSolarSystemFindUnique(...a),
    },
  },
}));

// zKillboard's lookup-by-ID and the EVE image CDN both go through the global
// `fetch`, dispatched here by host so a test only has to describe the parts it
// cares about.
interface KillFetchMocks {
  /** "not-found" = zKillboard has no record; "error" = it 5xxs. */
  zkb?: { hash: string; totalValue?: number } | "not-found" | "error";
  /** Variations the image CDN reports for the victim's ship type. */
  imageVariations?: string[];
}

function mockKillFetches({
  zkb,
  imageVariations = ["render"],
}: KillFetchMocks) {
  global.fetch = jest.fn((url: string | URL) => {
    const href = String(url);
    if (href.includes("zkillboard.com")) {
      if (zkb === "not-found") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        } as unknown as Response);
      }
      if (!zkb || zkb === "error") {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({}),
        } as unknown as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ killmail_id: 1, zkb }]),
      } as unknown as Response);
    }
    if (href.includes("images.evetech.net")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(imageVariations),
      } as unknown as Response);
    }
    return Promise.reject(new Error(`Unexpected fetch in test: ${href}`));
  }) as unknown as typeof fetch;
}

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
    mockGetKillmail.mockReset();
    mockGetCharactersDetail.mockReset();
    mockGetCorporationsCorporationId.mockReset();
    mockGetAlliancesAllianceId.mockReset();
    mockTypeFindUnique.mockReset();
    mockSolarSystemFindUnique.mockReset();
    mockFactionFindUnique.mockReset();
    // Most tests never reach zKillboard/ESI; default to "no record" so a test
    // that forgets to mock further still gets a deterministic fallback rather
    // than an unhandled rejection.
    mockKillFetches({ zkb: "not-found" });
  });

  it("falls back to the plain card when zKillboard has no record of the kill", async () => {
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

  it("builds a killboard-style card from just the numeric id, via zKillboard's hash lookup", async () => {
    mockKillFetches({
      zkb: { hash: "abc123", totalValue: 128_500_000 },
      imageVariations: ["render"],
    });
    mockGetKillmail.mockResolvedValue({
      data: {
        killmail_id: 12345,
        killmail_time: "2026-01-02T03:04:05Z",
        solar_system_id: 30000142,
        victim: {
          character_id: 90000001,
          corporation_id: 98000001,
          ship_type_id: 587,
        },
        attackers: [
          {
            character_id: 90000002,
            corporation_id: 98000002,
            final_blow: true,
            damage_done: 100,
          },
          { character_id: 90000003, final_blow: false, damage_done: 50 },
        ],
      },
    });
    mockTypeFindUnique.mockResolvedValue({ name: "Rifter" });
    mockSolarSystemFindUnique.mockResolvedValue({ name: "Jita" });
    mockGetCharactersDetail.mockImplementation((...args: unknown[]) =>
      Promise.resolve({
        data:
          args[0] === 90000001
            ? { name: "Victim Vic", corporation_id: 98000001 }
            : { name: "Final Blow Fred", corporation_id: 98000002 },
      }),
    );
    mockGetCorporationsCorporationId.mockImplementation((...args: unknown[]) =>
      Promise.resolve({
        data: {
          name: args[0] === 98000001 ? "Victim Corp" : "Attacker Corp",
        },
      }),
    );

    const { generateMetadata } = await import("~/app/kill/[killId]/page");
    const result = await generateMetadata({ params: rp({ killId: "12345" }) });

    expect(result.title).toBe("Rifter destroyed");
    expect(result.description).toContain("Victim Vic (Victim Corp)");
    expect(result.description).toContain("their Rifter");
    expect(result.description).toContain("in Jita");
    expect(result.description).toContain("2 attackers");
    expect(result.description).toContain(
      "Final blow by Final Blow Fred (Attacker Corp)",
    );
    expect(result.description).toContain("128.5M ISK");

    // The image is the ship's own render, unfurled directly — no generated
    // /api/og card, no brand chrome — mirroring zKillboard/EVE-Kill.
    const images = result.openGraph?.images as {
      url: string;
      width: number;
      height: number;
    }[];
    expect(images[0]?.url).toBe(
      "https://images.evetech.net/types/587/render?size=512",
    );
    expect(images[0]?.width).toBe(512);
    expect(images[0]?.height).toBe(512);
    expect(result.twitter).toHaveProperty("card", "summary");
  });

  it("uses an explicit ?hash= without ever calling zKillboard", async () => {
    // zKillboard is mocked to error — the test fails if the hash-recovery path
    // is reached at all.
    mockKillFetches({ zkb: "error" });
    mockGetKillmail.mockResolvedValue({
      data: {
        killmail_id: 12345,
        killmail_time: "2026-01-02T03:04:05Z",
        solar_system_id: 30000142,
        victim: { corporation_id: 98000001, ship_type_id: 587 },
        attackers: [{ faction_id: 500001, final_blow: true, damage_done: 100 }],
      },
    });
    mockTypeFindUnique.mockResolvedValue({ name: "Rifter" });
    mockSolarSystemFindUnique.mockResolvedValue({ name: "Jita" });
    mockGetCorporationsCorporationId.mockResolvedValue({
      data: { name: "Victim Corp" },
    });
    mockFactionFindUnique.mockResolvedValue({ name: "Guristas Pirates" });

    const { generateMetadata } = await import("~/app/kill/[killId]/page");
    const result = await generateMetadata({
      params: rp({ killId: "12345" }),
      searchParams: rp({ hash: "explicit-hash" }),
    });

    expect(mockGetKillmail).toHaveBeenCalledWith("explicit-hash", 12345);
    const fetchMock = global.fetch as jest.Mock;
    expect(
      fetchMock.mock.calls.some((call: unknown[]) =>
        String(call[0]).includes("zkillboard.com"),
      ),
    ).toBe(false);
    expect(result.description).toContain("Victim Corp");
    expect(result.description).toContain("Final blow by Guristas Pirates");
  });

  it("falls back to the plain card when ESI is unavailable after the hash resolves", async () => {
    mockKillFetches({ zkb: { hash: "abc123" } });
    mockGetKillmail.mockRejectedValue(new Error("esi down"));
    const { generateMetadata } = await import("~/app/kill/[killId]/page");
    const result = await generateMetadata({ params: rp({ killId: "12345" }) });
    expect(result.title).toBe("Killmail #12345");
  });

  it("names a structure victim by its alliance, not its corporation", async () => {
    mockKillFetches({ zkb: { hash: "abc123" } });
    mockGetKillmail.mockResolvedValue({
      data: {
        killmail_id: 12345,
        killmail_time: "2026-01-02T03:04:05Z",
        solar_system_id: 30000142,
        victim: {
          corporation_id: 98000001,
          alliance_id: 99000001,
          ship_type_id: 35833,
        },
        attackers: [{ damage_done: 100, final_blow: true }],
      },
    });
    mockTypeFindUnique.mockResolvedValue({ name: "Fortizar" });
    mockSolarSystemFindUnique.mockResolvedValue({ name: "Brybier" });
    mockGetAlliancesAllianceId.mockResolvedValue({
      data: { name: "Some Alliance" },
    });

    const { generateMetadata } = await import("~/app/kill/[killId]/page");
    const result = await generateMetadata({ params: rp({ killId: "12345" }) });

    expect(result.description).toContain("Some Alliance lost");
    // Exactly one attacker — the singular form, not "1 attackers".
    expect(result.description).toContain("1 attacker.");
    expect(mockGetCorporationsCorporationId).not.toHaveBeenCalled();
    // No character/faction on either side to name the final blow — the
    // sentence just states the loss.
    expect(result.description).not.toContain("Final blow");
  });

  it("omits the victim clause rather than failing the card when ESI errors", async () => {
    mockKillFetches({ zkb: { hash: "abc123" } });
    mockGetKillmail.mockResolvedValue({
      data: {
        killmail_id: 12345,
        killmail_time: "2026-01-02T03:04:05Z",
        solar_system_id: 30000142,
        victim: { corporation_id: 98000001, ship_type_id: 587 },
        attackers: [{ damage_done: 100, final_blow: true }],
      },
    });
    mockTypeFindUnique.mockResolvedValue({ name: "Rifter" });
    mockSolarSystemFindUnique.mockResolvedValue({ name: "Jita" });
    mockGetCorporationsCorporationId.mockRejectedValue(new Error("esi down"));

    const { generateMetadata } = await import("~/app/kill/[killId]/page");
    const result = await generateMetadata({ params: rp({ killId: "12345" }) });

    expect(result.title).toBe("Rifter destroyed");
    expect(result.description).toContain("A capsuleer lost");
  });

  it("falls back to a generic ship/title clause when the ship type isn't in our database", async () => {
    mockKillFetches({ zkb: { hash: "abc123", totalValue: 1_000_000 } });
    mockGetKillmail.mockResolvedValue({
      data: {
        killmail_id: 12345,
        killmail_time: "2026-01-02T03:04:05Z",
        solar_system_id: 30000142,
        victim: { corporation_id: 98000001, ship_type_id: 99999999 },
        attackers: [
          { damage_done: 100, final_blow: true },
          { damage_done: 50, final_blow: false },
        ],
      },
    });
    // Not yet ingested into the local Type table — a real scenario for a
    // brand-new hull.
    mockTypeFindUnique.mockResolvedValue(null);
    mockSolarSystemFindUnique.mockResolvedValue({ name: "Jita" });
    mockGetCorporationsCorporationId.mockResolvedValue({
      data: { name: "Victim Corp" },
    });

    const { generateMetadata } = await import("~/app/kill/[killId]/page");
    const result = await generateMetadata({ params: rp({ killId: "12345" }) });

    expect(result.title).toBe("Killmail #12345");
    expect(result.description).toContain("Victim Corp lost their ship");
    expect(result.description).toContain("in Jita");
    expect(result.description).toContain("2 attackers");
  });

  it("omits the system clause when the solar system isn't in our database", async () => {
    mockKillFetches({ zkb: { hash: "abc123" } });
    mockGetKillmail.mockResolvedValue({
      data: {
        killmail_id: 12345,
        killmail_time: "2026-01-02T03:04:05Z",
        // Not (yet) ingested into the local SolarSystem table.
        solar_system_id: 99999999,
        victim: { corporation_id: 98000001, ship_type_id: 587 },
        attackers: [{ damage_done: 100, final_blow: true }],
      },
    });
    mockTypeFindUnique.mockResolvedValue({ name: "Rifter" });
    mockSolarSystemFindUnique.mockResolvedValue(null);
    mockGetCorporationsCorporationId.mockResolvedValue({
      data: { name: "Victim Corp" },
    });

    const { generateMetadata } = await import("~/app/kill/[killId]/page");
    const result = await generateMetadata({ params: rp({ killId: "12345" }) });

    expect(result.title).toBe("Rifter destroyed");
    expect(result.description).toContain("Victim Corp lost their Rifter to");
    expect(result.description).not.toContain(" in ");
  });

  it("keeps the rest of the card when only a database lookup rejects", async () => {
    // Regression test: prisma.type/solarSystem.findUnique used to run bare
    // inside the Promise.all, so a transient DB error there discarded the
    // already-resolved victim/attacker/value/image data and fell all the way
    // back to the generic "Killmail #id" card.
    mockKillFetches({
      zkb: { hash: "abc123", totalValue: 1_000_000 },
      imageVariations: ["render"],
    });
    mockGetKillmail.mockResolvedValue({
      data: {
        killmail_id: 12345,
        killmail_time: "2026-01-02T03:04:05Z",
        solar_system_id: 30000142,
        victim: { corporation_id: 98000001, ship_type_id: 587 },
        attackers: [{ damage_done: 100, final_blow: true }],
      },
    });
    mockTypeFindUnique.mockRejectedValue(new Error("db timeout"));
    mockSolarSystemFindUnique.mockResolvedValue({ name: "Jita" });
    mockGetCorporationsCorporationId.mockResolvedValue({
      data: { name: "Victim Corp" },
    });

    const { generateMetadata } = await import("~/app/kill/[killId]/page");
    const result = await generateMetadata({ params: rp({ killId: "12345" }) });

    // The ship name specifically is unavailable, so the title falls back —
    // but everything else the DB blip didn't touch survives.
    expect(result.title).toBe("Killmail #12345");
    expect(result.description).toContain("Victim Corp lost their ship");
    expect(result.description).toContain("in Jita");
    expect(result.description).toContain("1M ISK");
    const images = result.openGraph?.images as { url: string }[];
    expect(images[0]?.url).toBe(
      "https://images.evetech.net/types/587/render?size=512",
    );
  });

  it("omits the final blow clause when no attacker is flagged as the final blow", async () => {
    mockKillFetches({ zkb: { hash: "abc123" } });
    mockGetKillmail.mockResolvedValue({
      data: {
        killmail_id: 12345,
        killmail_time: "2026-01-02T03:04:05Z",
        solar_system_id: 30000142,
        victim: { corporation_id: 98000001, ship_type_id: 587 },
        // No attacker carries `final_blow: true` — incomplete/edge-case data.
        attackers: [{ damage_done: 100, final_blow: false }],
      },
    });
    mockTypeFindUnique.mockResolvedValue({ name: "Rifter" });
    mockSolarSystemFindUnique.mockResolvedValue({ name: "Jita" });
    mockGetCorporationsCorporationId.mockResolvedValue({
      data: { name: "Victim Corp" },
    });

    const { generateMetadata } = await import("~/app/kill/[killId]/page");
    const result = await generateMetadata({ params: rp({ killId: "12345" }) });

    expect(result.description).toContain("Victim Corp lost their Rifter");
    expect(result.description).not.toContain("Final blow");
    expect(mockGetCharactersDetail).not.toHaveBeenCalled();
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
