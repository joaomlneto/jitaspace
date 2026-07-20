"use client";

import { useEffect, useState } from "react";

import type { GetMarketsRegionIdOrdersQueryResponse } from "@jitaspace/esi-client";
import {
  getMarketsRegionIdOrders,
  useGetUniverseRegions,
} from "@jitaspace/esi-client";

/**
 * The major market-hub regions, in rough order of trade volume. Orders for any
 * given type are overwhelmingly concentrated here, so fetching these first lets
 * the (paginated, 20-row) order tables reach their full size almost immediately
 * instead of waiting on the long tail of low-volume regions — which improves the
 * Largest Contentful Paint on the market page. Every region is still fetched;
 * only the order in which the requests are kicked off changes.
 */
const MARKET_HUB_REGION_IDS = [
  10000002, // The Forge (Jita)
  10000043, // Domain (Amarr)
  10000032, // Sinq Laison (Dodixie)
  10000030, // Heimatar (Rens)
  10000042, // Metropolis (Hek)
];

/** Hub regions first (in hub order), then every other region. */
function prioritizeMarketHubs(regionIds: number[]): number[] {
  const hubs = MARKET_HUB_REGION_IDS.filter((id) => regionIds.includes(id));
  const rest = regionIds.filter((id) => !MARKET_HUB_REGION_IDS.includes(id));
  return [...hubs, ...rest];
}

export function useTypeMarketOrders(typeId?: number) {
  const [regionOrders, setRegionOrders] = useState<
    Record<number, GetMarketsRegionIdOrdersQueryResponse>
  >([]);
  const { data: regions } = useGetUniverseRegions(
    {},
    { query: { enabled: typeId !== undefined } },
  );

  useEffect(() => {
    // if no type is selected, there are no orders!
    if (!typeId) {
      setRegionOrders({});
      return;
    }

    const loadMarketOrdersFromRegion = async (regionId: number) => {
      const firstPage = await getMarketsRegionIdOrders(regionId, {
        page: 1,
        type_id: typeId,
        order_type: "all",
      });
      const orders = firstPage.data;
      const xPages: unknown = firstPage.headers["x-pages"];
      const numPages = typeof xPages === "string" ? Number(xPages) : 0;
      for (let page = 2; page <= numPages; page++) {
        const pageResults = await getMarketsRegionIdOrders(regionId, {
          page,
          type_id: typeId,
          order_type: "all",
        });
        orders.push(...pageResults.data);
      }
      setRegionOrders((prev) => ({ ...prev, [regionId]: orders }));
    };

    prioritizeMarketHubs(regions?.data ?? []).forEach((regionId) => {
      void loadMarketOrdersFromRegion(regionId);
    });
  }, [typeId, regions, setRegionOrders]);

  return { data: regionOrders };
}
