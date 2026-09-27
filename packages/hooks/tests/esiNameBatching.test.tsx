import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";

// Batched name resolution through POST /universe/names. Names used to be
// resolved one request per id against an endpoint that takes a thousand, so a
// hangar of 800 item types cost 800 requests.
//
// The real @react-hook/cache LRU runs (via its CommonJS build), and each test
// uses its own id range because that cache is module-level. @swc/jest does not
// hoist jest.mock, so the hooks are required lazily.
jest.mock("@react-hook/cache", () =>
  require("@react-hook/cache/dist/main/index.js"),
);
jest.mock("@react-hook/latest", () =>
  require("@react-hook/latest/dist/main/index.js"),
);

const mockPostUniverseNames = jest.fn<(ids: number[]) => Promise<unknown>>();
const mockGetStargate = jest.fn<(id: number) => Promise<unknown>>();

jest.mock("@jitaspace/esi-client", () => ({
  __esModule: true,
  postUniverseNames: (ids: number[]) => mockPostUniverseNames(ids),
  getUniverseStargatesStargateId: (id: number) => mockGetStargate(id),
  getAcceptLanguage: () => "en",
  subscribeToAcceptLanguage: () => () => undefined,
}));

// Every id below is passed with an explicit category, so the id-range
// inference never runs; the ranges are stubbed only so the import resolves.
jest.mock("@jitaspace/esi-metadata", () => ({
  __esModule: true,
  isIdInRanges: () => false,
  allianceIdRanges: [],
  characterIdRanges: [],
  corporationIdRanges: [],
  stargateRanges: [],
  stationRanges: [],
}));

jest.mock("../src/hooks/useEsiAcceptLanguage", () => ({
  __esModule: true,
  useEsiAcceptLanguage: () => "en",
}));

const { useEsiName, useEsiNameLookup, useEsiNamesCache } =
  require("../src/hooks/useEsiName") as typeof import("../src/hooks/useEsiName");

const types = (from: number, count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: from + index,
    category: "inventory_type" as const,
  }));

/** ESI's answer for a batch: a name for every id. */
const answer = (ids: number[]) =>
  Promise.resolve({
    data: ids.map((id) => ({
      id,
      name: `Type ${id}`,
      category: "inventory_type",
    })),
  });

/**
 * The cache's own record of one id. useEsiNameLookup's record only ever holds
 * entries that carry a value, so a failed lookup has to be read here.
 */
const cacheStatusOf = (id: number) =>
  renderHook(() => useEsiNamesCache()).result.current[`en\u0000${id}`]?.status;

const httpError = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), { response: { status } });

describe("batched name resolution", () => {
  beforeEach(() => {
    mockPostUniverseNames.mockReset();
    mockGetStargate.mockReset();
  });

  it("resolves every name a render asks for in one request", async () => {
    mockPostUniverseNames.mockImplementation(answer);
    const entries = types(100, 5);

    const { result } = renderHook(() => useEsiNameLookup(entries));

    await waitFor(() =>
      expect(result.current["104"]?.value?.name).toBe("Type 104"),
    );
    expect(mockPostUniverseNames).toHaveBeenCalledTimes(1);
    expect(mockPostUniverseNames.mock.calls[0]?.[0]).toEqual([
      100, 101, 102, 103, 104,
    ]);
  });

  it("splits more than 1000 ids into requests of at most 1000", async () => {
    mockPostUniverseNames.mockImplementation(answer);
    const entries = types(10_000, 1500);

    renderHook(() => useEsiNameLookup(entries));

    await waitFor(() => expect(mockPostUniverseNames).toHaveBeenCalledTimes(2));
    expect(mockPostUniverseNames.mock.calls.map(([ids]) => ids.length)).toEqual(
      [1000, 500],
    );
  });

  it("isolates an id ESI rejects instead of failing the whole batch", async () => {
    // ESI rejects the entire request when any one id is unresolvable. The
    // batch is bisected until the bad id fails on its own.
    const BAD = 203;
    mockPostUniverseNames.mockImplementation((ids) =>
      ids.includes(BAD) ? Promise.reject(httpError(404)) : answer(ids),
    );
    const entries = types(200, 8);

    const { result } = renderHook(() => useEsiNameLookup(entries));

    await waitFor(() => expect(cacheStatusOf(BAD)).toBe("error"));
    for (const { id } of entries.filter(({ id }) => id !== BAD)) {
      expect(result.current[String(id)]?.value?.name).toBe(`Type ${id}`);
    }
    // 8 ids with one bad one: 1 + 2 + 2 + 2 requests, not one per id.
    expect(mockPostUniverseNames).toHaveBeenCalledTimes(7);
  });

  it("does not split a batch that failed because ESI is down", async () => {
    // Bisecting a 5xx (or a 420 error-limit response) would multiply the load
    // on an API that is already failing.
    mockPostUniverseNames.mockRejectedValue(httpError(503));
    const entries = types(300, 8);

    renderHook(() => useEsiNameLookup(entries));

    await waitFor(() => expect(cacheStatusOf(300)).toBe("error"));
    expect(cacheStatusOf(307)).toBe("error");
    expect(mockPostUniverseNames).toHaveBeenCalledTimes(1);
  });

  it("resolves stargates through their own endpoint, outside the batch", async () => {
    // /universe/names cannot resolve stargates.
    mockGetStargate.mockResolvedValue({ data: { name: "Stargate (Jita)" } });

    const { result } = renderHook(() => useEsiName(50000001, "stargate"));

    await waitFor(() => expect(result.current.name).toBe("Stargate (Jita)"));
    expect(mockPostUniverseNames).not.toHaveBeenCalled();
  });
});
