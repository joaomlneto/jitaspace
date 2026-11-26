/**
 * @jest-environment node
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import type * as CdnPurgeModule from "../lib/cdnPurge";

const mockAfter = jest.fn<(callback: () => Promise<void>) => void>();
jest.mock("next/server", () => ({
  after: (callback: () => Promise<void>) => mockAfter(callback),
}));

const mockCaptureException = jest.fn();
jest.mock("@sentry/nextjs", () => ({
  captureException: (error: unknown) => mockCaptureException(error),
}));

const mockEnv: {
  CLOUDFLARE_ZONE_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  NEXT_PUBLIC_SITE_URL?: string;
} = {};
jest.mock("~/env", () => ({ env: mockEnv }));

// Loaded lazily, after the mocks above are registered: @swc/jest does not hoist
// jest.mock above a top-level import.
const { cdnPurgeBody, MAX_PURGE_PREFIXES, purgeCdn, purgeCdnAfterResponse } =
  require("../lib/cdnPurge") as typeof CdnPurgeModule;

const mockFetch = jest.fn<typeof fetch>();
const realFetch = globalThis.fetch;

beforeEach(() => {
  mockAfter.mockReset();
  mockCaptureException.mockReset();
  mockFetch.mockReset();
  globalThis.fetch = mockFetch;
  mockEnv.CLOUDFLARE_ZONE_ID = "zone123";
  mockEnv.CLOUDFLARE_API_TOKEN = "token456";
  mockEnv.NEXT_PUBLIC_SITE_URL = "https://www.jita.space";
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

const accepted = () =>
  Response.json({ success: true, errors: [], result: { id: "zone123" } });

describe("cdnPurgeBody", () => {
  it("purges paths by prefix on the site's host", () => {
    expect(
      cdnPurgeBody(
        { pathPrefixes: ["/alliances", "/alliance/1"] },
        "www.jita.space",
      ),
    ).toEqual({
      prefixes: ["www.jita.space/alliances", "www.jita.space/alliance/1"],
    });
  });

  it("purges everything when asked to", () => {
    expect(cdnPurgeBody({ everything: true }, "www.jita.space")).toEqual({
      purge_everything: true,
    });
  });

  it("purges everything rather than guess the host", () => {
    expect(cdnPurgeBody({ pathPrefixes: ["/alliances"] }, undefined)).toEqual({
      purge_everything: true,
    });
  });

  it("purges everything rather than send more prefixes than one request takes", () => {
    const pathPrefixes = Array.from(
      { length: MAX_PURGE_PREFIXES + 1 },
      (_, i) => `/alliance/${i + 1}`,
    );
    expect(cdnPurgeBody({ pathPrefixes }, "www.jita.space")).toEqual({
      purge_everything: true,
    });
    expect(
      cdnPurgeBody(
        { pathPrefixes: pathPrefixes.slice(0, MAX_PURGE_PREFIXES) },
        "www.jita.space",
      ),
    ).toHaveProperty("prefixes");
  });
});

describe("purgeCdn", () => {
  it("posts the purge to the zone with the token", async () => {
    mockFetch.mockResolvedValue(accepted());

    await purgeCdn({ pathPrefixes: ["/alliance/7"] });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] ?? [];
    expect(url).toBe(
      "https://api.cloudflare.com/client/v4/zones/zone123/purge_cache",
    );
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer token456" });
    expect(JSON.parse(init?.body as string)).toEqual({
      prefixes: ["www.jita.space/alliance/7"],
    });
  });

  it("throws when Cloudflare refuses the purge", async () => {
    mockFetch.mockResolvedValue(
      Response.json(
        { success: false, errors: [{ code: 1134, message: "rate limit" }] },
        { status: 429 },
      ),
    );

    await expect(purgeCdn({ everything: true })).rejects.toThrow(
      /HTTP 429.*1134/,
    );
  });

  it("does nothing without a zone and token", async () => {
    mockEnv.CLOUDFLARE_API_TOKEN = undefined;

    await purgeCdn({ everything: true });

    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("purgeCdnAfterResponse", () => {
  it("schedules nothing when purging is not configured (Vercel)", () => {
    mockEnv.CLOUDFLARE_ZONE_ID = undefined;

    purgeCdnAfterResponse({ everything: true });

    expect(mockAfter).not.toHaveBeenCalled();
  });

  it("purges after the response, and reports a failure instead of throwing", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    purgeCdnAfterResponse({ everything: true });

    // Nothing is sent until the response is out.
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockAfter).toHaveBeenCalledTimes(1);
    await mockAfter.mock.calls[0]?.[0]();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockCaptureException).toHaveBeenCalledWith(
      new Error("network down"),
    );
  });
});
