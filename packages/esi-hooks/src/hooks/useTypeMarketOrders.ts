import { useEffect, useState } from "react";

import {
  getMarketsRegionIdOrders,
  GetMarketsRegionIdOrders200Item,
  useGetUniverseRegions,
} from "@jitaspace/esi-client";

export function useTypeMarketOrders(typeId?: number) {
  const [regionOrders, setRegionOrders] = useState<
    Record<number, GetMarketsRegionIdOrders200Item[]>
  >([]);
  const { data: regions } = useGetUniverseRegions(
    {},
    { swr: { enabled: typeId !== undefined } },
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
      });
      const orders = firstPage.data;
      const numPages = firstPage.headers["x-pages"];
      for (let page = 2; page <= numPages; page++) {
        const pageResults = await getMarketsRegionIdOrders(regionId, {
          page,
          type_id: typeId,
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