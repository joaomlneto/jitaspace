"use client";

import { useGetMarketsGroupsMarketGroupId } from "@jitaspace/esi-client";

export const useMarketGroup = (marketGroupId: number) => {
  const { data } = useGetMarketsGroupsMarketGroupId(marketGroupId);
  return { ...data?.data };
};
