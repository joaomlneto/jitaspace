import { useMemo } from "react";

import {
  useGetMarketsPrices,
  type GetMarketsPricesQueryResponse,
} from "@jitaspace/esi-client-kubb";





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
