import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook } from "@testing-library/react";

import type * as UseTradesOnGlobalMarketModule from "../src/hooks/useTradesOnGlobalMarket";

// @swc/jest does not hoist jest.mock above imports, so the module under test
// is required lazily below, after the mock is registered.
jest.mock("@jitaspace/esi-client", () => ({
  __esModule: true,
  useGetMarketsRegionIdTypes: jest.fn(),
}));

const { useGetMarketsRegionIdTypes } = require("@jitaspace/esi-client") as {
  useGetMarketsRegionIdTypes: jest.MockedFunction<
    (
      regionId: number,
      params?: unknown,
      headers?: unknown,
      options?: { query?: { enabled?: boolean; retry?: unknown } },
    ) => { data?: { data: number[] }; isError: boolean }
  >;
};

const { useTradesOnGlobalMarket } =
  require("../src/hooks/useTradesOnGlobalMarket") as typeof UseTradesOnGlobalMarketModule;

const PLEX = 44992;

describe("useTradesOnGlobalMarket", () => {
  beforeEach(() => {
    useGetMarketsRegionIdTypes.mockReturnValue({
      data: { data: [PLEX] },
      isError: false,
    });
  });

  it("asks ESI for the global PLEX market's types, without retrying", () => {
    renderHook(() => useTradesOnGlobalMarket(PLEX));
    expect(useGetMarketsRegionIdTypes).toHaveBeenCalledWith(
      19000001,
      undefined,
      undefined,
      { query: { enabled: true, retry: false } },
    );
  });

  it("says whether the type is on that list", () => {
    expect(renderHook(() => useTradesOnGlobalMarket(PLEX)).result.current).toBe(
      true,
    );
    expect(renderHook(() => useTradesOnGlobalMarket(34)).result.current).toBe(
      false,
    );
  });

  it("is undefined until ESI answers, and false if it could not", () => {
    useGetMarketsRegionIdTypes.mockReturnValue({ isError: false });
    expect(
      renderHook(() => useTradesOnGlobalMarket(PLEX)).result.current,
    ).toBeUndefined();

    useGetMarketsRegionIdTypes.mockReturnValue({ isError: true });
    expect(renderHook(() => useTradesOnGlobalMarket(PLEX)).result.current).toBe(
      false,
    );
  });

  it("asks nothing without a type", () => {
    const { result } = renderHook(() => useTradesOnGlobalMarket(undefined));
    expect(result.current).toBeUndefined();
    expect(useGetMarketsRegionIdTypes).toHaveBeenCalledWith(
      19000001,
      undefined,
      undefined,
      { query: { enabled: false, retry: false } },
    );
  });
});
