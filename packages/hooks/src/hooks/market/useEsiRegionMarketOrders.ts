"use client";

import type { GetMarketsRegionIdOrdersQueryResponse } from "@jitaspace/esi-client";

export { useGetMarketsRegionIdOrders as useEsiRegionMarketOrders } from "@jitaspace/esi-client";

export type RegionalMarketOrder = GetMarketsRegionIdOrdersQueryResponse[number];
