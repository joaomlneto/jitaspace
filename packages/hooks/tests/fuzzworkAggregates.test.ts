import { describe, expect, it } from "@jest/globals";

import type { GetAggregatesQueryResponse } from "@jitaspace/fuzzworks-market-client";

import {
  chunkTypeIds,
  FUZZWORK_TYPES_PER_REQUEST,
  parseFuzzworkAggregates,
} from "../src/hooks/market/fuzzworkAggregates";

describe("chunkTypeIds", () => {
  it("returns no chunks for an empty list", () => {
    expect(chunkTypeIds([])).toEqual([]);
  });

  it("returns a single chunk when under the limit", () => {
    const ids = Array.from({ length: 250 }, (_, i) => i);
    const chunks = chunkTypeIds(ids);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual(ids);
  });

  it("returns a single chunk at exactly the limit", () => {
    const ids = Array.from({ length: FUZZWORK_TYPES_PER_REQUEST }, (_, i) => i);
    expect(chunkTypeIds(ids)).toHaveLength(1);
  });

  it("splits past the limit into evenly-sized chunks plus a remainder", () => {
    const ids = Array.from({ length: 1100 }, (_, i) => i);
    const chunks = chunkTypeIds(ids);
    expect(chunks.map((c) => c.length)).toEqual([500, 500, 100]);
    // every id is preserved exactly once, in order
    expect(chunks.flat()).toEqual(ids);
  });

  it("honours a custom chunk size", () => {
    expect(chunkTypeIds([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});

describe("parseFuzzworkAggregates", () => {
  it("returns an empty map for an empty response", () => {
    expect(parseFuzzworkAggregates({})).toEqual({});
  });

  it("converts Fuzzwork's string numbers into typed numeric aggregates", () => {
    const raw = {
      "34": {
        buy: {
          weightedAverage: "5.5",
          max: "6",
          stddev: "0.5",
          median: "5",
          volume: "1000",
          orderCount: "10",
          percentile: "5.95",
        },
        sell: {
          weightedAverage: "7.5",
          max: "8",
          stddev: "0.6",
          median: "7",
          volume: "2000",
          orderCount: "20",
          percentile: "7.05",
        },
      },
    } as unknown as GetAggregatesQueryResponse;

    const parsed = parseFuzzworkAggregates(raw);

    expect(parsed["34"]).toEqual({
      buy: {
        weightedAverage: 5.5,
        max: 6,
        stddev: 0.5,
        median: 5,
        volume: 1000,
        orderCount: 10,
        percentile: 5.95,
      },
      sell: {
        weightedAverage: 7.5,
        max: 8,
        stddev: 0.6,
        median: 7,
        volume: 2000,
        orderCount: 20,
        percentile: 7.05,
      },
    });
    expect(typeof parsed["34"]!.buy.percentile).toBe("number");
  });
});
