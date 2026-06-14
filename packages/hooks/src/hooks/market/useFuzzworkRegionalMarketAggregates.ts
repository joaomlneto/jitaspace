"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import type { GetAggregatesQueryResponse } from "@jitaspace/fuzzworks-market-client";
import { getAggregates } from "@jitaspace/fuzzworks-market-client";

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
const FUZZWORK_TYPES_PER_REQUEST = 500;

export const useFuzzworkRegionalMarketAggregates = (
  typeIds: number[],
  regionId: number,
) => {
  const sortedTypeIds = useMemo(
    () => typeIds.toSorted((a, b) => a - b),
    [typeIds],
  );

  const query = useQuery({
    queryKey: [
      "fuzzwork-regional-market-aggregates",
      regionId,
      sortedTypeIds,
    ] as const,
    enabled: sortedTypeIds.length > 0,
    // max every 5 minutes
    refetchInterval: 5 * 60 * 1000,
    queryFn: async () => {
      const chunks: number[][] = [];
      for (
        let i = 0;
        i < sortedTypeIds.length;
        i += FUZZWORK_TYPES_PER_REQUEST
      ) {
        chunks.push(sortedTypeIds.slice(i, i + FUZZWORK_TYPES_PER_REQUEST));
      }

      const responses = await Promise.all(
        chunks.map((chunk) =>
          getAggregates({
            // FIXME: Generator wont support specifying array of integers for a query parameter.
            //        As a workaround, we set it as a string and convert it here instead.
            types: chunk.join(","),
            region: regionId,
          }),
        ),
      );

      return responses.reduce<GetAggregatesQueryResponse>(
        (acc, res) => Object.assign(acc, res.data),
        {},
      );
    },
  });

  // Fuzzworks returns all the numbers as strings... we just convert it here to numbers
  const data = useMemo(() => {
    if (!query.data) return null;
    const result: Record<string, FuzzworkTypeMarketAggregate> = {};
    Object.entries(query.data).forEach(([typeId, stat]) => {
      result[typeId] = {
        buy: {
          max: Number(stat.buy.max),
          median: Number(stat.buy.median),
          orderCount: Number(stat.buy.orderCount),
          percentile: Number(stat.buy.percentile),
          stddev: Number(stat.buy.stddev),
          volume: Number(stat.buy.volume),
          weightedAverage: Number(stat.buy.weightedAverage),
        },
        sell: {
          max: Number(stat.sell.max),
          median: Number(stat.sell.median),
          orderCount: Number(stat.sell.orderCount),
          percentile: Number(stat.sell.percentile),
          stddev: Number(stat.sell.stddev),
          volume: Number(stat.sell.volume),
          weightedAverage: Number(stat.sell.weightedAverage),
        },
      };
    });
    return result;
  }, [query.data]);

  return {
    ...query,
    data,
  };
};
