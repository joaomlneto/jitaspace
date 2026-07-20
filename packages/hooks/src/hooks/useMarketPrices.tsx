"use client";

import { useMemo } from "react";

import type { GetMarketsPricesQueryResponse } from "@jitaspace/esi-client";
import { useGetMarketsPrices } from "@jitaspace/esi-client";

export function useMarketPrices() {
  const { data: arrayData, error, isLoading } = useGetMarketsPrices();

  const data = useMemo(() => {
    const index: Record<string, GetMarketsPricesQueryResponse[number]> = {};
    arrayData?.data.forEach((item) => {
      index[item.type_id] = item;
    });
    return index;
  }, [arrayData?.data]);

  return { data, error, isLoading };
}
