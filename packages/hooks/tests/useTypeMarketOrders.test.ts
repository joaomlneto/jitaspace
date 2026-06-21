import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";

import type * as UseTypeMarketOrdersModule from "../src/hooks/useTypeMarketOrders";

// Replace the generated ESI client so the hook never makes a real request (and
// the real axios client is never loaded). @swc/jest does not hoist jest.mock
// above imports, so the module under test is required lazily below, after the
// mock is registered.
jest.mock("@jitaspace/esi-client", () => ({
  __esModule: true,
  useGetUniverseRegions: jest.fn(),
  getMarketsRegionIdOrders: jest.fn(),
}));

const { useGetUniverseRegions, getMarketsRegionIdOrders } =
  require("@jitaspace/esi-client") as {
    useGetUniverseRegions: jest.MockedFunction<
      () => { data?: { data: number[] } }
    >;
    getMarketsRegionIdOrders: jest.MockedFunction<
      (
        regionId: number,
        params: unknown,
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

describe("useTypeMarketOrders", () => {
  beforeEach(() => {
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
});
