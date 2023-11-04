import {
  GetMarketsRegionIdOrdersQueryResponse,
  useGetMarketsRegionIdOrders,
} from "@jitaspace/esi-client";

export type RegionalMarketOrder = GetMarketsRegionIdOrdersQueryResponse[number];

export const useEsiRegionMarketOrders = useGetMarketsRegionIdOrders;
