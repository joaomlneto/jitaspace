"use client";

import { useGetMarketsGroupsMarketGroupId } from "@jitaspace/esi-client";
import { useGetMarketGroupById } from "@jitaspace/sde-client";





export const useMarketGroup = (marketGroupId: number) => {
  const { data: sdeData } = useGetMarketGroupById(marketGroupId);
  const { data: esiData } = useGetMarketsGroupsMarketGroupId(marketGroupId);
  return {
    ...(sdeData?.data ?? {}),
    ...(esiData?.data ?? {}),
  };
};
