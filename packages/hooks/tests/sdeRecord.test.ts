import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import type { SdeMarketGroup, SdeType } from "../src/hooks/sde/sdeRecord";
import { sdeRecordQueryOptions } from "../src/hooks/sde/sdeRecord";

// Only the global `fetch` is replaced here (no jest.mock of a module), so the
// module under test can be imported statically.

/** The bits of `Response` that `fetchSdeRecord` actually touches. */
interface ResponseStub {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<unknown>;
}

const originalFetch = global.fetch;

let mockFetch: jest.Mock<(input: string) => Promise<ResponseStub>>;

function okResponse(body: unknown): ResponseStub {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: () => Promise.resolve(body),
  };
}

/**
 * `fetchSdeRecord` is not exported — the only way in is the `queryFn` the
 * options carry. React Query would pass a query context that the fetch helper
 * ignores, so an argument-less call is equivalent.
 */
function invokeQueryFn(options: { queryFn?: unknown }): Promise<unknown> {
  return (options.queryFn as () => Promise<unknown>)();
}

const TRITANIUM: SdeType = {
  typeId: 34,
  name: "Tritanium",
  groupId: 18,
  marketGroupId: 1857,
};

beforeEach(() => {
  mockFetch = jest.fn<(input: string) => Promise<ResponseStub>>();
  global.fetch = mockFetch as unknown as typeof fetch;
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe("sdeRecordQueryOptions", () => {
  it("keys the query by resource and id", () => {
    expect(sdeRecordQueryOptions("type", 34).queryKey).toEqual([
      "sde",
      "type",
      34,
    ]);
    expect(sdeRecordQueryOptions("market-group", 1857).queryKey).toEqual([
      "sde",
      "market-group",
      1857,
    ]);
    // The raw id is kept in the key, so a missing id cannot collide with the
    // cache entry of a record whose id really is 0.
    expect(sdeRecordQueryOptions("type", undefined).queryKey).toEqual([
      "sde",
      "type",
      undefined,
    ]);
  });

  it("never goes stale and does not retry a failed lookup", () => {
    const options = sdeRecordQueryOptions("group", 18);

    expect(options.staleTime).toBe(Infinity);
    expect(options.retry).toBe(false);
  });

  it("is enabled for a usable id", () => {
    expect(sdeRecordQueryOptions("type", 34).enabled).toBe(true);
    expect(sdeRecordQueryOptions("agent", 3018970).enabled).toBe(true);
  });

  it("is disabled for a missing, zero or negative id", () => {
    expect(sdeRecordQueryOptions("type", undefined).enabled).toBe(false);
    expect(sdeRecordQueryOptions("type", 0).enabled).toBe(false);
    expect(sdeRecordQueryOptions("type", -1).enabled).toBe(false);
  });
});

describe("sdeRecordQueryOptions queryFn", () => {
  it("resolves the parsed record on a 200", async () => {
    mockFetch.mockResolvedValue(okResponse(TRITANIUM));

    const record = await invokeQueryFn(sdeRecordQueryOptions("type", 34));

    expect(record).toEqual(TRITANIUM);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith("/api/sde/type/34");
  });

  it("resolves null on a 404 instead of throwing", async () => {
    // "no such id" is a normal answer, so the body is never read.
    const json = jest.fn<() => Promise<unknown>>(() => Promise.resolve({}));
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json,
    });

    await expect(
      invokeQueryFn(sdeRecordQueryOptions("type", 99999999)),
    ).resolves.toBeNull();
    expect(mockFetch).toHaveBeenCalledWith("/api/sde/type/99999999");
    expect(json).not.toHaveBeenCalled();
  });

  it("rejects on any other non-ok status, reporting it in the message", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.resolve({}),
    });

    await expect(
      invokeQueryFn(sdeRecordQueryOptions("market-group", 1857)),
    ).rejects.toThrow(
      "Failed to load market-group 1857: 500 Internal Server Error",
    );
  });

  it("rejects on a 429 too — only 404 is treated as an answer", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      json: () => Promise.resolve({}),
    });

    await expect(
      invokeQueryFn(sdeRecordQueryOptions("type", 34)),
    ).rejects.toThrow("Failed to load type 34: 429 Too Many Requests");
  });

  it("addresses the API route by resource segment, hyphens and all", async () => {
    const marketGroup: SdeMarketGroup = {
      marketGroupId: 1857,
      name: "Minerals",
      description: "Minerals",
      parentMarketGroupId: 1031,
      iconId: null,
    };
    mockFetch.mockResolvedValue(okResponse(marketGroup));

    await invokeQueryFn(sdeRecordQueryOptions("market-group", 1857));
    await invokeQueryFn(sdeRecordQueryOptions("agent", 3018970));
    await invokeQueryFn(sdeRecordQueryOptions("dogma-attribute-category", 7));

    expect(mockFetch.mock.calls.map(([url]) => url)).toEqual([
      "/api/sde/market-group/1857",
      "/api/sde/agent/3018970",
      "/api/sde/dogma-attribute-category/7",
    ]);
  });

  it("falls back to id 0 when there is no id, which the API cannot resolve", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: () => Promise.resolve({}),
    });

    // `enabled` normally stops this from ever running; the fallback only keeps
    // the fetch well-typed if it somehow does.
    await expect(
      invokeQueryFn(sdeRecordQueryOptions("faction", undefined)),
    ).resolves.toBeNull();
    expect(mockFetch).toHaveBeenCalledWith("/api/sde/faction/0");
  });
});
