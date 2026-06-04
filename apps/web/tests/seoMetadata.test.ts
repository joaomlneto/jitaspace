import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

// Mock client components to avoid loading heavy client-side dependency trees
// (they pull in @tanstack/db → fractional-indexing which uses ESM syntax)
jest.mock("~/app/character/[characterId]/page.client", () => ({
  default: () => null,
}));
jest.mock("~/app/corporation/[corporationId]/page.client", () => ({
  default: () => null,
}));
jest.mock("~/app/alliance/[allianceId]/page.client", () => ({
  default: () => null,
}));
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
  return jest.fn().mockRejectedValue(new Error("network error"));
}

function resolvedParams<T>(obj: T): Promise<T> {
  return Promise.resolve(obj);
}

// ---------------------------------------------------------------------------
// Character generateMetadata
// ---------------------------------------------------------------------------

describe("character/[characterId] generateMetadata", () => {
  beforeEach(() => jest.resetModules());
  afterEach(() => {
    (global as Record<string, unknown>).fetch = undefined;
  });

  it("returns name + portrait for a valid character id", async () => {
    (global as Record<string, unknown>).fetch = mockFetchOk({
      name: "Jita Trader",
    });
    const { generateMetadata } = await import(
      "~/app/character/[characterId]/page"
    );
    const result = await generateMetadata({
      params: resolvedParams({ characterId: "90000001" }),
    });
    expect(result.title).toBe("Jita Trader");
    expect(
      (result.openGraph as { images?: { url: string }[] })?.images?.[0]?.url,
    ).toContain("90000001");
    expect((result.twitter as { images?: string[] })?.images?.[0]).toContain(
      "90000001",
    );
  });

  it("returns empty object for id = 0", async () => {
    const { generateMetadata } = await import(
      "~/app/character/[characterId]/page"
    );
    const result = await generateMetadata({
      params: resolvedParams({ characterId: "0" }),
    });
    expect(result).toEqual({});
  });

  it("returns empty object for non-numeric id", async () => {
    const { generateMetadata } = await import(
      "~/app/character/[characterId]/page"
    );
    const result = await generateMetadata({
      params: resolvedParams({ characterId: "invalid" }),
    });
    expect(result).toEqual({});
  });

  it("returns empty object for negative id", async () => {
    const { generateMetadata } = await import(
      "~/app/character/[characterId]/page"
    );
    const result = await generateMetadata({
      params: resolvedParams({ characterId: "-1" }),
    });
    expect(result).toEqual({});
  });

  it("returns empty object for Infinity", async () => {
    const { generateMetadata } = await import(
      "~/app/character/[characterId]/page"
    );
    const result = await generateMetadata({
      params: resolvedParams({ characterId: "Infinity" }),
    });
    expect(result).toEqual({});
  });

  it("returns empty object when ESI returns non-ok", async () => {
    (global as Record<string, unknown>).fetch = mockFetchFail();
    const { generateMetadata } = await import(
      "~/app/character/[characterId]/page"
    );
    const result = await generateMetadata({
      params: resolvedParams({ characterId: "90000001" }),
    });
    expect(result).toEqual({});
  });

  it("returns empty object when fetch throws", async () => {
    (global as Record<string, unknown>).fetch = mockFetchThrow();
    const { generateMetadata } = await import(
      "~/app/character/[characterId]/page"
    );
    const result = await generateMetadata({
      params: resolvedParams({ characterId: "90000001" }),
    });
    expect(result).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Corporation generateMetadata
// ---------------------------------------------------------------------------

describe("corporation/[corporationId] generateMetadata", () => {
  beforeEach(() => jest.resetModules());
  afterEach(() => {
    (global as Record<string, unknown>).fetch = undefined;
  });

  it("returns name + description + logo for a valid corp id", async () => {
    (global as Record<string, unknown>).fetch = mockFetchOk({
      name: "Jita Corp",
      description: "<b>We trade</b>",
    });
    const { generateMetadata } = await import(
      "~/app/corporation/[corporationId]/page"
    );
    const result = await generateMetadata({
      params: resolvedParams({ corporationId: "98000001" }),
    });
    expect(result.title).toBe("Jita Corp");
    expect(result.description).toBe("We trade");
    expect(
      (result.openGraph as { images?: { url: string }[] })?.images?.[0]?.url,
    ).toContain("98000001");
  });

  it("strips HTML tags from description", async () => {
    (global as Record<string, unknown>).fetch = mockFetchOk({
      name: "Corp",
      description: "<p>Hello <b>world</b></p>",
    });
    const { generateMetadata } = await import(
      "~/app/corporation/[corporationId]/page"
    );
    const result = await generateMetadata({
      params: resolvedParams({ corporationId: "98000001" }),
    });
    expect(result.description).toBe("Hello world");
  });

  it("truncates description to 200 chars", async () => {
    (global as Record<string, unknown>).fetch = mockFetchOk({
      name: "Corp",
      description: "x".repeat(300),
    });
    const { generateMetadata } = await import(
      "~/app/corporation/[corporationId]/page"
    );
    const result = await generateMetadata({
      params: resolvedParams({ corporationId: "98000001" }),
    });
    expect((result.description ?? "").length).toBe(200);
  });

  it("returns empty object for non-numeric id", async () => {
    const { generateMetadata } = await import(
      "~/app/corporation/[corporationId]/page"
    );
    const result = await generateMetadata({
      params: resolvedParams({ corporationId: "abc" }),
    });
    expect(result).toEqual({});
  });

  it("returns empty object when ESI returns non-ok", async () => {
    (global as Record<string, unknown>).fetch = mockFetchFail();
    const { generateMetadata } = await import(
      "~/app/corporation/[corporationId]/page"
    );
    const result = await generateMetadata({
      params: resolvedParams({ corporationId: "98000001" }),
    });
    expect(result).toEqual({});
  });

  it("returns empty object when fetch throws", async () => {
    (global as Record<string, unknown>).fetch = mockFetchThrow();
    const { generateMetadata } = await import(
      "~/app/corporation/[corporationId]/page"
    );
    const result = await generateMetadata({
      params: resolvedParams({ corporationId: "98000001" }),
    });
    expect(result).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Alliance generateMetadata
// ---------------------------------------------------------------------------

describe("alliance/[allianceId] generateMetadata", () => {
  beforeEach(() => jest.resetModules());
  afterEach(() => {
    (global as Record<string, unknown>).fetch = undefined;
  });

  it("returns name + logo for a valid alliance id", async () => {
    (global as Record<string, unknown>).fetch = mockFetchOk({
      name: "Pandemic Horde",
    });
    const { generateMetadata } = await import(
      "~/app/alliance/[allianceId]/page"
    );
    const result = await generateMetadata({
      params: resolvedParams({ allianceId: "99005338" }),
    });
    expect(result.title).toBe("Pandemic Horde");
    expect(
      (result.openGraph as { images?: { url: string }[] })?.images?.[0]?.url,
    ).toContain("99005338");
  });

  it("returns empty object for non-numeric id", async () => {
    const { generateMetadata } = await import(
      "~/app/alliance/[allianceId]/page"
    );
    const result = await generateMetadata({
      params: resolvedParams({ allianceId: "xyz" }),
    });
    expect(result).toEqual({});
  });

  it("returns empty object for Infinity", async () => {
    const { generateMetadata } = await import(
      "~/app/alliance/[allianceId]/page"
    );
    const result = await generateMetadata({
      params: resolvedParams({ allianceId: "Infinity" }),
    });
    expect(result).toEqual({});
  });

  it("returns empty object when ESI returns non-ok", async () => {
    (global as Record<string, unknown>).fetch = mockFetchFail();
    const { generateMetadata } = await import(
      "~/app/alliance/[allianceId]/page"
    );
    const result = await generateMetadata({
      params: resolvedParams({ allianceId: "99005338" }),
    });
    expect(result).toEqual({});
  });

  it("returns empty object when fetch throws", async () => {
    (global as Record<string, unknown>).fetch = mockFetchThrow();
    const { generateMetadata } = await import(
      "~/app/alliance/[allianceId]/page"
    );
    const result = await generateMetadata({
      params: resolvedParams({ allianceId: "99005338" }),
    });
    expect(result).toEqual({});
  });
});
