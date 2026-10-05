import type { RenderHookResult } from "@testing-library/react";
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
 * Reads the cache's own record, since useEsiNameLookup's record only ever holds
 * entries that carry a value and a failed lookup has to be read here. One probe
 * per test, re-rendered per read: mounting a fresh one inside waitFor adds a
 * DOM node per poll, and waitFor re-polls on every DOM mutation, so a status
 * that stays pending for a while spins until the heap runs out.
 */
let cacheProbe: RenderHookResult<ReturnType<typeof useEsiNamesCache>, unknown>;
const cacheStatusOf = (id: number) => {
  cacheProbe.rerender();
  return cacheProbe.result.current[`en\u0000${id}`]?.status;
};

const httpError = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), { response: { status } });

describe("batched name resolution", () => {
  beforeEach(() => {
    mockPostUniverseNames.mockReset();
    mockGetStargate.mockReset();
    cacheProbe = renderHook(() => useEsiNamesCache());
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

  it("retries a transient failure once instead of failing the batch", async () => {
    // One 5xx would otherwise fail every name in the batch at once, and failed
    // names are never re-fetched — the whole page would read "Unknown".
    mockPostUniverseNames
      .mockRejectedValueOnce(httpError(503))
      .mockImplementation(answer);
    const entries = types(300, 4);

    const { result } = renderHook(() => useEsiNameLookup(entries));

    await waitFor(
      () => expect(result.current["303"]?.value?.name).toBe("Type 303"),
      { timeout: 3000 },
    );
    expect(mockPostUniverseNames).toHaveBeenCalledTimes(2);
  });

  it("does not split a batch that keeps failing because ESI is down", async () => {
    // Bisecting a 5xx would multiply the load on an API that is already
    // failing: one retry, then the batch fails as a whole.
    mockPostUniverseNames.mockRejectedValue(httpError(503));
    const entries = types(310, 8);

    renderHook(() => useEsiNameLookup(entries));

    await waitFor(() => expect(cacheStatusOf(310)).toBe("error"), {
      timeout: 3000,
    });
    expect(cacheStatusOf(317)).toBe("error");
    expect(mockPostUniverseNames).toHaveBeenCalledTimes(2);
  });

  it("neither retries nor splits when ESI's error limit is hit", async () => {
    // 420 means ESI is already rationing our errors; another request, or a
    // bisection's worth of them, only spends more of that budget.
    mockPostUniverseNames.mockRejectedValue(httpError(420));
    const entries = types(320, 8);

    renderHook(() => useEsiNameLookup(entries));

    await waitFor(() => expect(cacheStatusOf(320)).toBe("error"));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockPostUniverseNames).toHaveBeenCalledTimes(1);
  });

  it("never sends an id beyond int32 to /universe/names", async () => {
    // A market order in an Upwell structure: ESI 400s the whole batch on an id
    // it cannot coerce to int32, so it must not join one. The station beside
    // it still resolves, in a batch of its own.
    mockPostUniverseNames.mockImplementation(answer);
    const STRUCTURE = 1_044_752_365_771;

    const station = renderHook(() => useEsiName(70_000, "inventory_type"));
    const structure = renderHook(() => useEsiName(STRUCTURE));

    await waitFor(() => expect(station.result.current.name).toBe("Type 70000"));
    await waitFor(() => expect(cacheStatusOf(STRUCTURE)).toBe("error"));
    expect(structure.result.current.name).toBeUndefined();
    expect(mockPostUniverseNames).toHaveBeenCalledTimes(1);
    expect(mockPostUniverseNames.mock.calls[0]?.[0]).toEqual([70_000]);
  });

  it("resolves stargates through their own endpoint, outside the batch", async () => {
    // /universe/names cannot resolve stargates.
    mockGetStargate.mockResolvedValue({ data: { name: "Stargate (Jita)" } });

    const { result } = renderHook(() => useEsiName(50000001, "stargate"));

    await waitFor(() => expect(result.current.name).toBe("Stargate (Jita)"));
    expect(mockPostUniverseNames).not.toHaveBeenCalled();
  });
});
