import { useMemo } from "react";

import { useGetMarketsPrices, type GetMarketsPrices200Item } from "../client";

export function useMarketPrices() {
  const {
    data: arrayData,
    error,
    isLoading,
    isValidating,
  } = useGetMarketsPrices();

  const data = useMemo(() => {
    const index: Record<string, GetMarketsPrices200Item> = {};
    arrayData?.data.forEach((item) => {
      index[item.type_id] = item;
    });
    return index;
  }, [arrayData?.data]);

  return { data, error, isLoading, isValidating };
}
