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

type RegionOrders = Record<number, GetMarketsRegionIdOrdersQueryResponse>;

/** Stable empty result, so consumers memoising on `data` don't rerun while idle. */
const NO_ORDERS: RegionOrders = {};

/** Hub regions (in hub order), separated from every other region. */
function splitMarketHubs(regionIds: number[]): {
  hubs: number[];
  rest: number[];
} {
  return {
    hubs: MARKET_HUB_REGION_IDS.filter((id) => regionIds.includes(id)),
    rest: regionIds.filter((id) => !MARKET_HUB_REGION_IDS.includes(id)),
  };
}

/** Every page of orders for one type in one region. */
async function fetchRegionOrders(
  regionId: number,
  typeId: number,
): Promise<GetMarketsRegionIdOrdersQueryResponse> {
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
  return orders;
}

/**
 * Requests a whole batch of regions in parallel, resolving once every one has
 * settled so the caller can commit them in a single state update. A region that
 * fails (ESI 5xx, timeout) is left out instead of rejecting the whole batch.
 */
async function fetchRegionsOrders(
  regionIds: number[],
  typeId: number,
): Promise<RegionOrders> {
  const results = await Promise.allSettled(
    regionIds.map((regionId) => fetchRegionOrders(regionId, typeId)),
  );

  const orders: RegionOrders = {};
  results.forEach((result, index) => {
    const regionId = regionIds[index];
    if (regionId !== undefined && result.status === "fulfilled") {
      orders[regionId] = result.value;
    }
  });
  return orders;
}

interface MarketOrdersState {
  /** The type `orders` belong to; `undefined` before the first commit. */
  typeId?: number;
  /** Whether the hub batch has been committed for `typeId`. */
  hubsLoaded: boolean;
  orders: RegionOrders;
}

export function useTypeMarketOrders(typeId?: number) {
  const [state, setState] = useState<MarketOrdersState>({
    hubsLoaded: false,
    orders: NO_ORDERS,
  });
  const { data: regions } = useGetUniverseRegions(
    {},
    { query: { enabled: typeId !== undefined } },
  );
  const regionIds = regions?.data;

  useEffect(() => {
    // if no type is selected, there are no orders!
    if (typeId === undefined || regionIds === undefined) return;

    // Read through a function: TypeScript narrows a directly-referenced flag to
    // `false` and keeps that narrowing across the awaits below, which makes the
    // cancellation checks look statically dead.
    let cancelled = false;
    const isCancelled = () => cancelled;
    const { hubs, rest } = splitMarketHubs(regionIds);

    // Orders are committed in two batches — the hubs, then the long tail —
    // rather than one state update per region as it lands. The order tables page
    // at 20 rows, so per-region commits used to grow them a few rows at a time,
    // and every one of those steps shifted everything below the table down. That
    // was the bulk of the market page's Cumulative Layout Shift.
    void (async () => {
      const hubOrders = await fetchRegionsOrders(hubs, typeId);
      if (isCancelled()) return;
      setState({ typeId, hubsLoaded: true, orders: hubOrders });

      const restOrders = await fetchRegionsOrders(rest, typeId);
      if (isCancelled()) return;
      setState({
        typeId,
        hubsLoaded: true,
        orders: { ...hubOrders, ...restOrders },
      });
    })();

    // Requests already in flight can't be recalled, but their results must not
    // land in the next type's order tables.
    return () => {
      cancelled = true;
    };
  }, [typeId, regionIds]);

  // Both values are derived rather than stored, so the very first render after
  // `typeId` changes already reports "loading" with no orders. A flag flipped
  // inside the effect would render one frame of empty-but-not-loading table
  // first, and the skeleton replacing it would be its own layout shift.
  const isCurrent = state.typeId === typeId;

  return {
    data: isCurrent ? state.orders : NO_ORDERS,
    isLoading: typeId !== undefined && !(isCurrent && state.hubsLoaded),
  };
}
