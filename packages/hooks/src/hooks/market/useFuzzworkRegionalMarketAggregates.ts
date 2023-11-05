import { useMemo } from "react";

import { useGetAggregates } from "@jitaspace/fuzzworks-market-client";





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

export const useFuzzworkRegionalMarketAggregates = (
  typeIds: number[],
  regionId: number,
) => {
  const sortedTypeIds = useMemo(() => typeIds.sort(), [typeIds]);
  const query = useGetAggregates(
    {
      // FIXME: Generator wont support specifying array of integers for a query parameter.
      //        As a workaround, we set it as a string and convert it here instead.
      types: sortedTypeIds.join(","),
      region: regionId,
    },
    {
      query: {
        // max every 5 minutes
        refetchInterval: 5 * 60 * 1000,
      },
    },
  );

  // Fuzzworks returns all the numbers as strings... we just convert it here to numbers
  const data = useMemo(() => {
    if (!query.data?.data) return null;
    const result: Record<string, FuzzworkTypeMarketAggregate> = {};
    Object.entries(query.data.data).forEach(([typeId, stat]) => {
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
  }, [query.data?.data]);

  return {
    ...query,
    data,
  };
};
