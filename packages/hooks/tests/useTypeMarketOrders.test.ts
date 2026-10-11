import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react";

import type * as UseTypeMarketOrdersModule from "../src/hooks/useTypeMarketOrders";

// Replace the generated ESI client so the hook never makes a real request (and
// the real axios client is never loaded). @swc/jest does not hoist jest.mock
// above imports, so the module under test is required lazily below, after the
// mock is registered.
jest.mock("@jitaspace/esi-client", () => ({
  __esModule: true,
  useGetUniverseRegions: jest.fn(),
  useGetMarketsRegionIdTypes: jest.fn(),
  getMarketsRegionIdOrders: jest.fn(),
}));

const {
  useGetUniverseRegions,
  useGetMarketsRegionIdTypes,
  getMarketsRegionIdOrders,
} = require("@jitaspace/esi-client") as {
  useGetUniverseRegions: jest.MockedFunction<
    () => { data?: { data: number[] } }
  >;
  useGetMarketsRegionIdTypes: jest.MockedFunction<
    () => { data?: { data: number[] }; isError: boolean }
  >;
  getMarketsRegionIdOrders: jest.MockedFunction<
    (
      regionId: number,
      params: unknown,
      headers?: unknown,
      config?: { signal?: AbortSignal },
    ) => Promise<{ data: unknown[]; headers: Record<string, string> }>
  >;
};

const { useTypeMarketOrders } =
  require("../src/hooks/useTypeMarketOrders") as typeof UseTypeMarketOrdersModule;

// A region list deliberately NOT in hub order: two filler regions are
// interleaved with three of the trade hubs, so a passing test can only come
// from explicit prioritisation (not from the input happening to be hub-first).
const THE_FORGE = 10000002;
const DOMAIN = 10000043;
const HEIMATAR = 10000030;
const FILLER_A = 10000069;
const FILLER_B = 10000001;
const UNSORTED_REGIONS = [FILLER_A, DOMAIN, FILLER_B, THE_FORGE, HEIMATAR];
/** The hubs present in UNSORTED_REGIONS, in the order the hook requests them. */
const HUBS = [THE_FORGE, DOMAIN, HEIMATAR];

const PLEX = 44992;
const GLOBAL_PLEX_MARKET = 19000001;

describe("useTypeMarketOrders", () => {
  beforeEach(() => {
    useGetMarketsRegionIdTypes.mockReturnValue({
      data: { data: [PLEX] },
      isError: false,
    });
    getMarketsRegionIdOrders.mockResolvedValue({
      data: [],
      headers: { "x-pages": "1" },
    });
  });

  it("requests the major trade-hub regions before the long tail", async () => {
    useGetUniverseRegions.mockReturnValue({ data: { data: UNSORTED_REGIONS } });

    renderHook(() => useTypeMarketOrders(34));

    await waitFor(() =>
      expect(getMarketsRegionIdOrders).toHaveBeenCalledTimes(
        UNSORTED_REGIONS.length,
      ),
    );

    const requestedRegionOrder = getMarketsRegionIdOrders.mock.calls.map(
      ([regionId]) => regionId,
    );

    // Hubs first, in hub-priority order (Forge, Domain, Heimatar — Sinq Laison
    // and Metropolis are absent here), then the remaining regions in their
    // original order. No region is dropped.
    expect(requestedRegionOrder).toEqual([
      THE_FORGE,
      DOMAIN,
      HEIMATAR,
      FILLER_A,
      FILLER_B,
    ]);
  });

  it("requests the global PLEX market with the hubs for PLEX, and loads it with them", async () => {
    // Where ESI lists it: last, after wormhole and Abyssal space.
    const WORMHOLE = 11000001;
    useGetUniverseRegions.mockReturnValue({
      data: { data: [...UNSORTED_REGIONS, WORMHOLE, GLOBAL_PLEX_MARKET] },
    });
    // Hold the long tail: PLEX trades only on the global market, so its tables
    // must not stop loading until that region is in.
    const heldTail = new Promise<never>(() => undefined);
    getMarketsRegionIdOrders.mockImplementation((regionId) =>
      [...HUBS, GLOBAL_PLEX_MARKET].includes(regionId)
        ? Promise.resolve({
            data: [{ order_id: regionId }],
            headers: { "x-pages": "1" },
          })
        : heldTail,
    );

    const { result } = renderHook(() => useTypeMarketOrders(PLEX));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data[GLOBAL_PLEX_MARKET]).toEqual([
      { order_id: GLOBAL_PLEX_MARKET },
    ]);
    expect(
      getMarketsRegionIdOrders.mock.calls
        .slice(0, HUBS.length + 1)
        .map(([regionId]) => regionId),
    ).toEqual([...HUBS, GLOBAL_PLEX_MARKET]);
  });

  it("leaves the global PLEX market in the long tail for other types", async () => {
    useGetUniverseRegions.mockReturnValue({
      data: { data: [...UNSORTED_REGIONS, GLOBAL_PLEX_MARKET] },
    });
    // Hold the long tail: a type that doesn't trade there must not wait on it.
    const heldTail = new Promise<never>(() => undefined);
    getMarketsRegionIdOrders.mockImplementation((regionId) =>
      HUBS.includes(regionId)
        ? Promise.resolve({ data: [], headers: { "x-pages": "1" } })
        : heldTail,
    );

    const { result } = renderHook(() => useTypeMarketOrders(34));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(
      getMarketsRegionIdOrders.mock.calls
        .slice(0, HUBS.length)
        .map(([regionId]) => regionId),
    ).toEqual(HUBS);
  });

  it("waits to know where the type trades before requesting anything", () => {
    useGetUniverseRegions.mockReturnValue({ data: { data: UNSORTED_REGIONS } });
    useGetMarketsRegionIdTypes.mockReturnValue({ isError: false });

    const { result } = renderHook(() => useTypeMarketOrders(34));

    expect(getMarketsRegionIdOrders).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(true);
  });

  it("treats the type as an ordinary one if the global market can't be listed", async () => {
    useGetUniverseRegions.mockReturnValue({ data: { data: UNSORTED_REGIONS } });
    useGetMarketsRegionIdTypes.mockReturnValue({ isError: true });

    const { result } = renderHook(() => useTypeMarketOrders(PLEX));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(getMarketsRegionIdOrders).toHaveBeenCalledTimes(
      UNSORTED_REGIONS.length,
    );
  });

  it("doesn't start over when the global market's types load after failing", async () => {
    useGetUniverseRegions.mockReturnValue({ data: { data: UNSORTED_REGIONS } });
    useGetMarketsRegionIdTypes.mockReturnValue({ isError: true });

    const { result, rerender } = renderHook(() => useTypeMarketOrders(PLEX));
    await waitFor(() =>
      expect(getMarketsRegionIdOrders).toHaveBeenCalledTimes(
        UNSORTED_REGIONS.length,
      ),
    );

    useGetMarketsRegionIdTypes.mockReturnValue({
      data: { data: [PLEX] },
      isError: false,
    });
    rerender();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(getMarketsRegionIdOrders).toHaveBeenCalledTimes(
      UNSORTED_REGIONS.length,
    );
  });

  it("fetches nothing when no type is selected", () => {
    useGetUniverseRegions.mockReturnValue({ data: { data: UNSORTED_REGIONS } });

    renderHook(() => useTypeMarketOrders(undefined));

    expect(getMarketsRegionIdOrders).not.toHaveBeenCalled();
  });

  it("does not throw before the region list has loaded", () => {
    useGetUniverseRegions.mockReturnValue({ data: undefined });

    renderHook(() => useTypeMarketOrders(34));

    expect(getMarketsRegionIdOrders).not.toHaveBeenCalled();
  });

  it("reports loading from the very first render until the hub orders land", async () => {
    useGetUniverseRegions.mockReturnValue({ data: { data: UNSORTED_REGIONS } });

    // Hold every region request open, so the assertions below cannot race a
    // batch that already resolved.
    let releaseOrders = (): void => undefined;
    const held = new Promise<void>((resolve) => {
      releaseOrders = resolve;
    });
    getMarketsRegionIdOrders.mockImplementation(() =>
      held.then(() => ({ data: [], headers: { "x-pages": "1" } })),
    );

    const { result } = renderHook(() => useTypeMarketOrders(34));

    // Loading on the first render, before any orders can arrive. The order
    // tables rely on this to reserve their height instead of rendering empty.
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toEqual({});

    await act(async () => {
      releaseOrders();
      await held;
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("is never loading when no type is selected", () => {
    useGetUniverseRegions.mockReturnValue({ data: { data: UNSORTED_REGIONS } });

    const { result } = renderHook(() => useTypeMarketOrders(undefined));

    expect(result.current.isLoading).toBe(false);
  });

  it("commits orders in whole batches rather than once per region", async () => {
    useGetUniverseRegions.mockReturnValue({ data: { data: UNSORTED_REGIONS } });

    // Hold the long-tail regions so the hub batch is observed on its own;
    // otherwise both batches settle together and React coalesces the renders.
    let releaseTail = (): void => undefined;
    const heldTail = new Promise<void>((resolve) => {
      releaseTail = resolve;
    });
    getMarketsRegionIdOrders.mockImplementation((regionId) => {
      const response = {
        data: [{ order_id: regionId }],
        headers: { "x-pages": "1" },
      };
      return HUBS.includes(regionId)
        ? Promise.resolve(response)
        : heldTail.then(() => response);
    });

    const seenOrderCounts: number[] = [];
    const { result } = renderHook(() => {
      const value = useTypeMarketOrders(34);
      seenOrderCounts.push(Object.keys(value.data).length);
      return value;
    });

    await waitFor(() =>
      expect(Object.keys(result.current.data)).toHaveLength(HUBS.length),
    );
    await act(async () => {
      releaseTail();
      await heldTail;
    });
    await waitFor(() =>
      expect(Object.keys(result.current.data)).toHaveLength(
        UNSORTED_REGIONS.length,
      ),
    );

    // The tables only ever see no regions, the 3 hubs, or all 5 — never a
    // partially-filled batch. Growing them one region at a time is what shifted
    // everything below the table down the page.
    const batchSizes = [0, HUBS.length, UNSORTED_REGIONS.length];
    expect(
      seenOrderCounts.filter((count) => !batchSizes.includes(count)),
    ).toEqual([]);
    expect(seenOrderCounts).toContain(HUBS.length);
  });

  it("drops regions that fail without losing the rest of the batch", async () => {
    useGetUniverseRegions.mockReturnValue({ data: { data: UNSORTED_REGIONS } });
    getMarketsRegionIdOrders.mockImplementation((regionId) =>
      regionId === DOMAIN
        ? Promise.reject(new Error("ESI is having a moment"))
        : Promise.resolve({
            data: [{ order_id: regionId }],
            headers: { "x-pages": "1" },
          }),
    );

    const { result } = renderHook(() => useTypeMarketOrders(34));

    await waitFor(() =>
      expect(Object.keys(result.current.data)).toHaveLength(
        UNSORTED_REGIONS.length - 1,
      ),
    );
    expect(result.current.data[DOMAIN]).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it("does not show one type's orders while the next type is loading", async () => {
    useGetUniverseRegions.mockReturnValue({ data: { data: UNSORTED_REGIONS } });
    getMarketsRegionIdOrders.mockImplementation((regionId) =>
      Promise.resolve({
        data: [{ order_id: regionId }],
        headers: { "x-pages": "1" },
      }),
    );

    const { result, rerender } = renderHook(
      ({ typeId }: { typeId: number }) => useTypeMarketOrders(typeId),
      { initialProps: { typeId: 34 } },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    rerender({ typeId: 35 });

    // Switching type immediately clears the previous type's orders, so the table
    // shows skeletons rather than stale rows that would resize on arrival.
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toEqual({});
  });

  it("aborts the previous type's requests when the type changes", async () => {
    // Only the results used to be ignored: the requests themselves kept
    // downloading every region for a type the user had already left.
    useGetUniverseRegions.mockReturnValue({ data: { data: UNSORTED_REGIONS } });
    const signals: AbortSignal[] = [];
    getMarketsRegionIdOrders.mockImplementation(
      (_region, _params, _h, config) => {
        if (config?.signal) signals.push(config.signal);
        return new Promise(() => undefined); // never settles
      },
    );

    const { rerender } = renderHook(
      ({ typeId }: { typeId: number }) => useTypeMarketOrders(typeId),
      { initialProps: { typeId: 34 } },
    );
    await waitFor(() => expect(signals).toHaveLength(HUBS.length));
    expect(signals.every((signal) => !signal.aborted)).toBe(true);

    rerender({ typeId: 35 });

    expect(signals.slice(0, HUBS.length).every((s) => s.aborted)).toBe(true);
  });

  it("keeps at most 16 long-tail regions in flight at once", async () => {
    const TAIL = Array.from({ length: 40 }, (_, index) => 20000000 + index);
    useGetUniverseRegions.mockReturnValue({ data: { data: TAIL } });
    let inFlight = 0;
    let peak = 0;
    getMarketsRegionIdOrders.mockImplementation(async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight--;
      return { data: [], headers: { "x-pages": "1" } };
    });

    renderHook(() => useTypeMarketOrders(34));

    await waitFor(() =>
      expect(getMarketsRegionIdOrders).toHaveBeenCalledTimes(TAIL.length),
    );
    expect(peak).toBeLessThanOrEqual(16);
    expect(peak).toBeGreaterThan(1);
  });
});
