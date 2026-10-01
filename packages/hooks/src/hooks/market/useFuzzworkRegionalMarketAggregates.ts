"use client";

import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { GetAggregatesQueryResponse } from "@jitaspace/fuzzworks-market-client";
import { getAggregates } from "@jitaspace/fuzzworks-market-client";

import { chunkTypeIds, parseFuzzworkAggregates } from "./fuzzworkAggregates";

export type {
  FuzzworkMarketAggregateStats,
  FuzzworkTypeMarketAggregate,
} from "./fuzzworkAggregates";

export interface FuzzworkRegionalMarketAggregatesOptions {
  /**
   * Keep the previous ids' aggregates while a changed id list loads, rather
   * than dropping every price. Check `isPlaceholderData`: until it clears, an
   * id missing from `data` is still loading, not without orders.
   */
  keepPreviousData?: boolean;
}

export const useFuzzworkRegionalMarketAggregates = (
  typeIds: number[],
  regionId: number,
  options: FuzzworkRegionalMarketAggregatesOptions = {},
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
    placeholderData: options.keepPreviousData ? keepPreviousData : undefined,
    // max every 5 minutes
    refetchInterval: 5 * 60 * 1000,
    queryFn: async () => {
      const responses = await Promise.all(
        chunkTypeIds(sortedTypeIds).map((chunk) =>
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

  // Fuzzworks returns all the numbers as strings... we convert them to numbers here.
  const data = useMemo(
    () => (query.data ? parseFuzzworkAggregates(query.data) : null),
    [query.data],
  );

  return {
    ...query,
    data,
  };
};
