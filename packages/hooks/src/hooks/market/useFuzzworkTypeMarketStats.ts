"use client";

import { useMemo } from "react";

import { useFuzzworkRegionalMarketAggregates } from "./useFuzzworkRegionalMarketAggregates";


export const useFuzzworkTypeMarketStats = (
  typeId: number,
  regionId: number,
) => {
  const query = useFuzzworkRegionalMarketAggregates([typeId], regionId);

  const data = useMemo(() => {
    if (!query.data || !query.data[typeId]) return null;
    return query.data[typeId];
  }, [query.data]);

  return {
    ...query,
    data,
  };
};
