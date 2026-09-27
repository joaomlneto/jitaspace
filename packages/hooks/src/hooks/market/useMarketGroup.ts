"use client";

import { useGetMarketsGroupsMarketGroupId } from "@jitaspace/esi-client";

/**
 * A market group, plus whether it is still loading or failed.
 *
 * This used to return `{ ...data?.data }`, which made loading, failure and "no
 * such group" all the same empty object — a failed request silently truncated
 * the market breadcrumbs — and allocated a fresh object on every render, so
 * anything memoised on the result recomputed every time. `data` here is
 * react-query's own object and keeps its identity between renders.
 */
export const useMarketGroup = (marketGroupId: number) => {
  const { data, isLoading, error } =
    useGetMarketsGroupsMarketGroupId(marketGroupId);
  return { data: data?.data, isLoading, error };
};
