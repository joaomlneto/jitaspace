"use client";

import { useEffect, useState } from "react";

import type { GetMarketsRegionIdOrdersQueryResponse } from "@jitaspace/esi-client";
import {
  getMarketsRegionIdOrders,
  useGetUniverseRegions,
} from "@jitaspace/esi-client";

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

    regions?.data.map((regionId) => {
      void loadMarketOrdersFromRegion(regionId);
    });
  }, [typeId, regions, setRegionOrders]);

  return { data: regionOrders };
}
