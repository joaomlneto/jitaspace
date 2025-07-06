"use client";

import { useMemo } from "react";

import type { GetIndustrySystemsQueryResponse } from "@jitaspace/esi-client";
import {
  CostIndicesActivityEnum,
  costIndicesActivityEnum,
  useGetIndustrySystems,
} from "@jitaspace/esi-client";

export function useSolarSystemCostIndices() {
  const { data: arrayData, error, isLoading } = useGetIndustrySystems();

  const data: Record<string, GetIndustrySystemsQueryResponse[number]> =
    useMemo(() => {
      const index: Record<string, GetIndustrySystemsQueryResponse[number]> = {};
      arrayData?.data.forEach((item) => {
        index[item.solar_system_id] = item;
      });
      return index;
    }, [arrayData?.data]);

  const ranges = useMemo(() => {
    const result = Object.values(costIndicesActivityEnum).reduce(
      (acc, activity) => {
        acc[activity] = {
          min: undefined,
          max: undefined,
        };
        return acc;
      },
      {} as Record<CostIndicesActivityEnum, { min?: number; max?: number }>,
    );

    Object.values(data).forEach((item) => {
      item.cost_indices.forEach((index) => {
        const { activity, cost_index } = index;
        if (cost_index < (result[activity].min ?? Number.MAX_SAFE_INTEGER)) {
          result[activity].min = cost_index;
        }
        if (cost_index > (result[activity].max ?? Number.MIN_SAFE_INTEGER)) {
          result[activity].max = cost_index;
        }
      });
    });

    return result;
  }, [data]);

  return { data, ranges, error, isLoading };
}
