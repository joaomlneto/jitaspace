"use client";

import { useGetMarketsGroupsMarketGroupId } from "@jitaspace/esi-client";
import { useGetMarketGroupById } from "@jitaspace/sde-client";

export const useMarketGroup = (marketGroupId: number) => {
  const { data: sdeData } = useGetMarketGroupById(marketGroupId);
  const { data: esiData } = useGetMarketsGroupsMarketGroupId(marketGroupId);
  return {
    ...sdeData?.data,
    ...esiData?.data,
    // ESI returns `name` as a localized string, while the SDE returns it as an
    // object keyed by language. Normalise to a string so consumers can render
    // it directly (the SDE-only path otherwise leaks the raw object).
    name: esiData?.data.name ?? sdeData?.data.name.en,
  };
};
