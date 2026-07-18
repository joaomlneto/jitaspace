import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("@mantine/core", () => ({ Loader: () => null }));

// Mock client components to avoid loading heavy client-side dependency trees
jest.mock("~/app/character/[characterId]/page.client", () => ({
  default: () => null,
}));
jest.mock("~/app/corporation/[corporationId]/page.client", () => ({
  default: () => null,
}));
jest.mock("~/app/alliance/[allianceId]/page.client", () => ({
  default: () => null,
}));

// ---------------------------------------------------------------------------
// ESI-client mocks
// ---------------------------------------------------------------------------

const mockGetCharactersDetail = jest.fn();
const mockGetCorporationsCorporationId = jest.fn();
const mockGetAlliancesAllianceId = jest.fn();

jest.mock("@jitaspace/esi-client", () => ({
  getCharactersDetail: (...a: unknown[]) => mockGetCharactersDetail(...a),
  getCorporationsCorporationId: (...a: unknown[]) =>
    mockGetCorporationsCorporationId(...a),
  getAlliancesAllianceId: (...a: unknown[]) => mockGetAlliancesAllianceId(...a),
}));

function rp<T>(obj: T): Promise<T> {
  return Promise.resolve(obj);
}

// ---------------------------------------------------------------------------
// Character generateMetadata
// ---------------------------------------------------------------------------

describe("character/[characterId] generateMetadata", () => {
  beforeEach(() => {
    jest.resetModules();
    mockGetCharactersDetail.mockReset();
  });

  it("returns name + portrait for a valid character id", async () => {
    mockGetCharactersDetail.mockResolvedValue({
      data: { name: "Jita Trader" },
    });
    const { generateMetadata } =
      await import("~/app/character/[characterId]/page");
    const result = await generateMetadata({
      params: rp({ characterId: "90000001" }),
    });
    expect(result.title).toBe("Jita Trader");
    expect(
      (result.openGraph as { images?: { url: string }[] }).images?.[0]?.url,
    ).toContain("90000001");
  });

  it("returns empty object for id = 0", async () => {
    const { generateMetadata } =
      await import("~/app/character/[characterId]/page");
    expect(
      await generateMetadata({ params: rp({ characterId: "0" }) }),
    ).toEqual({});
  });

  it("returns empty object for non-numeric id", async () => {
    const { generateMetadata } =
      await import("~/app/character/[characterId]/page");
    expect(
      await generateMetadata({ params: rp({ characterId: "invalid" }) }),
    ).toEqual({});
  });

  it("returns empty object for negative id", async () => {
    const { generateMetadata } =
      await import("~/app/character/[characterId]/page");
    expect(
      await generateMetadata({ params: rp({ characterId: "-1" }) }),
    ).toEqual({});
  });

  it("returns empty object for Infinity", async () => {
    const { generateMetadata } =
      await import("~/app/character/[characterId]/page");
    expect(
      await generateMetadata({ params: rp({ characterId: "Infinity" }) }),
    ).toEqual({});
  });

  it("returns empty object when esi-client throws", async () => {
    mockGetCharactersDetail.mockRejectedValue(new Error("network error"));
    const { generateMetadata } =
      await import("~/app/character/[characterId]/page");
    expect(
      await generateMetadata({ params: rp({ characterId: "90000001" }) }),
    ).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Corporation generateMetadata
// ---------------------------------------------------------------------------

describe("corporation/[corporationId] generateMetadata", () => {
  beforeEach(() => {
    jest.resetModules();
    mockGetCorporationsCorporationId.mockReset();
  });

  it("returns name + description + logo for a valid corp id", async () => {
    mockGetCorporationsCorporationId.mockResolvedValue({
      data: { name: "Jita Corp", description: "<b>We trade</b>" },
    });
    const { generateMetadata } =
      await import("~/app/corporation/[corporationId]/page");
    const result = await generateMetadata({
      params: rp({ corporationId: "98000001" }),
    });
    expect(result.title).toBe("Jita Corp");
    expect(result.description).toBe("We trade");
    expect(
      (result.openGraph as { images?: { url: string }[] }).images?.[0]?.url,
    ).toContain("98000001");
  });

  it("strips HTML tags from description", async () => {
    mockGetCorporationsCorporationId.mockResolvedValue({
      data: { name: "Corp", description: "<p>Hello <b>world</b></p>" },
    });
    const { generateMetadata } =
      await import("~/app/corporation/[corporationId]/page");
    const result = await generateMetadata({
      params: rp({ corporationId: "98000001" }),
    });
    expect(result.description).toBe("Hello world");
  });

  it("truncates description to 200 chars", async () => {
    mockGetCorporationsCorporationId.mockResolvedValue({
      data: { name: "Corp", description: "x".repeat(300) },
    });
    const { generateMetadata } =
      await import("~/app/corporation/[corporationId]/page");
    const result = await generateMetadata({
      params: rp({ corporationId: "98000001" }),
    });
    expect((result.description ?? "").length).toBe(200);
  });

  it("returns empty object for non-numeric id", async () => {
    const { generateMetadata } =
      await import("~/app/corporation/[corporationId]/page");
    expect(
      await generateMetadata({ params: rp({ corporationId: "abc" }) }),
    ).toEqual({});
  });

  it("returns empty object when esi-client throws", async () => {
    mockGetCorporationsCorporationId.mockRejectedValue(new Error("network"));
    const { generateMetadata } =
      await import("~/app/corporation/[corporationId]/page");
    expect(
      await generateMetadata({ params: rp({ corporationId: "98000001" }) }),
    ).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Alliance generateMetadata
// ---------------------------------------------------------------------------

describe("alliance/[allianceId] generateMetadata", () => {
  beforeEach(() => {
    jest.resetModules();
    mockGetAlliancesAllianceId.mockReset();
  });

  it("returns name + logo for a valid alliance id", async () => {
    mockGetAlliancesAllianceId.mockResolvedValue({
      data: { name: "Pandemic Horde" },
    });
    const { generateMetadata } =
      await import("~/app/alliance/[allianceId]/page");
    const result = await generateMetadata({
      params: rp({ allianceId: "99005338" }),
    });
    expect(result.title).toBe("Pandemic Horde");
    expect(
      (result.openGraph as { images?: { url: string }[] }).images?.[0]?.url,
    ).toContain("99005338");
  });

  it("returns empty object for non-numeric id", async () => {
    const { generateMetadata } =
      await import("~/app/alliance/[allianceId]/page");
    expect(
      await generateMetadata({ params: rp({ allianceId: "xyz" }) }),
    ).toEqual({});
  });

  it("returns empty object for Infinity", async () => {
    const { generateMetadata } =
      await import("~/app/alliance/[allianceId]/page");
    expect(
      await generateMetadata({ params: rp({ allianceId: "Infinity" }) }),
    ).toEqual({});
  });

  it("returns empty object when esi-client throws", async () => {
    mockGetAlliancesAllianceId.mockRejectedValue(new Error("network"));
    const { generateMetadata } =
      await import("~/app/alliance/[allianceId]/page");
    expect(
      await generateMetadata({ params: rp({ allianceId: "99005338" }) }),
    ).toEqual({});
  });
});
