import type { GetAggregatesQueryResponse } from "@jitaspace/fuzzworks-market-client";

export type FuzzworkMarketAggregateStats = {
  weightedAverage: number;
  max: number;
  stddev: number;
  median: number;
  volume: number;
  orderCount: number;
  percentile: number;
};

export type FuzzworkTypeMarketAggregate = {
  buy: FuzzworkMarketAggregateStats;
  sell: FuzzworkMarketAggregateStats;
};

// Fuzzwork serves aggregates over a GET with the type IDs in the query string.
// The endpoint returns HTTP 414 (URI Too Long) once the URL grows past ~8KB
// (roughly 1000+ type IDs), so requests covering many types — e.g. the "all LP
// offers" page — must be split into chunks and merged. 500 keeps each URL well
// under the limit with comfortable margin for longer type IDs.
export const FUZZWORK_TYPES_PER_REQUEST = 500;

/** Split a list of type IDs into request-sized chunks. */
export function chunkTypeIds(
  typeIds: number[],
  size: number = FUZZWORK_TYPES_PER_REQUEST,
): number[][] {
  const chunks: number[][] = [];
  for (let i = 0; i < typeIds.length; i += size) {
    chunks.push(typeIds.slice(i, i + size));
  }
  return chunks;
}

// Fuzzwork returns every number as a string; the raw per-side stats mirror
// FuzzworkMarketAggregateStats with string values.
type RawAggregateStats = Record<keyof FuzzworkMarketAggregateStats, string>;

function parseStats(stats: RawAggregateStats): FuzzworkMarketAggregateStats {
  return {
    max: Number(stats.max),
    median: Number(stats.median),
    orderCount: Number(stats.orderCount),
    percentile: Number(stats.percentile),
    stddev: Number(stats.stddev),
    volume: Number(stats.volume),
    weightedAverage: Number(stats.weightedAverage),
  };
}

/**
 * Convert a (merged) Fuzzwork aggregates response — keyed by type ID, with all
 * numbers as strings — into a map of typed numeric aggregates.
 */
export function parseFuzzworkAggregates(
  response: GetAggregatesQueryResponse,
): Record<string, FuzzworkTypeMarketAggregate> {
  const result: Record<string, FuzzworkTypeMarketAggregate> = {};
  for (const [typeId, stat] of Object.entries(response)) {
    result[typeId] = {
      buy: parseStats(stat.buy as RawAggregateStats),
      sell: parseStats(stat.sell as RawAggregateStats),
    };
  }
  return result;
}
