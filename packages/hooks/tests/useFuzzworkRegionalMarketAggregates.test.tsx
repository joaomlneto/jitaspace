import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";

// Replace the generated Fuzzwork client so the hook never makes a real request
// (and the real axios client is never loaded). @swc/jest does not hoist
// jest.mock above imports, so the module under test is required lazily below,
// after the mock is registered.
jest.mock("@jitaspace/fuzzworks-market-client", () => ({
  __esModule: true,
  getAggregates: jest.fn(),
}));

const { getAggregates: mockGetAggregates } =
  require("@jitaspace/fuzzworks-market-client") as {
    getAggregates: jest.MockedFunction<
      (params: { types: string; region: number }) => Promise<{ data: unknown }>
    >;
  };

const { useFuzzworkRegionalMarketAggregates } =
  require("../src/hooks/market/useFuzzworkRegionalMarketAggregates") as typeof import("../src/hooks/market/useFuzzworkRegionalMarketAggregates");

const REGION = 10000002;

function rawStat(seed: number) {
  const s = String(seed);
  return {
    weightedAverage: s,
    max: s,
    stddev: s,
    median: s,
    volume: s,
    orderCount: s,
    percentile: s,
  };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useFuzzworkRegionalMarketAggregates", () => {
  beforeEach(() => {
    mockGetAggregates.mockImplementation((params) => {
      const data: Record<string, unknown> = {};
      for (const id of params.types.split(",")) {
        data[id] = { buy: rawStat(Number(id)), sell: rawStat(Number(id)) };
      }
      return Promise.resolve({ data });
    });
  });

  it("splits a large type list into 500-sized chunked requests and merges them", async () => {
    const typeIds = Array.from({ length: 1100 }, (_, i) => 1000 + i);

    const { result } = renderHook(
      () => useFuzzworkRegionalMarketAggregates(typeIds, REGION),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // 1100 ids -> chunks of 500, 500, 100
    expect(mockGetAggregates).toHaveBeenCalledTimes(3);
    const callSizes = mockGetAggregates.mock.calls.map(
      ([p]) => p.types.split(",").length,
    );
    expect(callSizes).toEqual([500, 500, 100]);
    // region is forwarded
    expect(mockGetAggregates.mock.calls[0]![0].region).toBe(REGION);

    // merged + parsed: every id present, numbers (not strings)
    expect(Object.keys(result.current.data ?? {})).toHaveLength(1100);
    expect(result.current.data?.["1000"]?.buy.percentile).toBe(1000);
    expect(typeof result.current.data?.["2099"]?.sell.volume).toBe("number");
  });

  it("is disabled and fetches nothing when there are no type ids", () => {
    const { result } = renderHook(
      () => useFuzzworkRegionalMarketAggregates([], REGION),
      { wrapper: createWrapper() },
    );

    expect(mockGetAggregates).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });
});
