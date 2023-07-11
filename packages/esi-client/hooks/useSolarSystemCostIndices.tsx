import { useMemo } from "react";

import {
  useGetIndustrySystems,
  type GetIndustrySystems200Item,
} from "../client";

export function useSolarSystemCostIndices() {
  const {
    data: arrayData,
    error,
    isLoading,
    isValidating,
  } = useGetIndustrySystems();

  const data: Record<string, GetIndustrySystems200Item> = useMemo(() => {
    const index: Record<string, GetIndustrySystems200Item> = {};
    arrayData?.data.forEach((item) => {
      index[item.solar_system_id] = item;
    });
    return index;
  }, [arrayData?.data]);

  const ranges = useMemo(() => {
    const ranges: Record<string, number> = {};
      arrayData?.data.forEach((item) => {
          ranges[item.solar_system_id] = item.cost_indices.cost_index;
      });
      return ranges;
  }

  return { data, error, isLoading, isValidating };
}
