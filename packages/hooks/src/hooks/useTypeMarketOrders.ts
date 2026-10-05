"use client";

import { useEffect, useState } from "react";

import type { GetMarketsRegionIdOrdersQueryResponse } from "@jitaspace/esi-client";
import {
  getMarketsRegionIdOrders,
  useGetUniverseRegions,
} from "@jitaspace/esi-client";

import { MARKET_HUB_REGION_IDS } from "./marketHubRegions";

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

/**
 * How many regions of the long tail are requested at once. The hubs go out
 * together regardless — there are at most five and they are what the tables
 * show first — but the other ~100 regions used to be fired in one burst, all
 * of it still running after the user had moved on to another type.
 */
const REGION_CONCURRENCY = 16;

/** Every page of orders for one type in one region. */
async function fetchRegionOrders(
  regionId: number,
  typeId: number,
  signal: AbortSignal,
): Promise<GetMarketsRegionIdOrdersQueryResponse> {
  const params = { type_id: typeId, order_type: "all" } as const;
  const firstPage = await getMarketsRegionIdOrders(
    regionId,
    { ...params, page: 1 },
    undefined,
    { signal },
  );
  const orders = firstPage.data;
  const xPages: unknown = firstPage.headers["x-pages"];
  const numPages = typeof xPages === "string" ? Number(xPages) : 0;
  for (let page = 2; page <= numPages; page++) {
    const pageResults = await getMarketsRegionIdOrders(
      regionId,
      { ...params, page },
      undefined,
      { signal },
    );
    orders.push(...pageResults.data);
  }
  return orders;
}

/**
 * Run `task` for every index with at most `concurrency` in flight, settling
 * each rather than failing fast. Stops starting new work once `signal` aborts;
 * indices never started are left unset.
 */
async function settleInPool<T>(
  count: number,
  concurrency: number,
  signal: AbortSignal,
  task: (index: number) => Promise<T>,
): Promise<(PromiseSettledResult<T> | undefined)[]> {
  const results = new Array<PromiseSettledResult<T> | undefined>(count);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < count && !signal.aborted) {
      const index = next++;
      try {
        results[index] = { status: "fulfilled", value: await task(index) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, count) }, worker),
  );
  return results;
}

/**
 * Requests a whole batch of regions, resolving once every one has settled so
 * the caller can commit them in a single state update. A region that fails
 * (ESI 5xx, timeout, or an abort) is left out instead of rejecting the batch.
 */
async function fetchRegionsOrders(
  regionIds: number[],
  typeId: number,
  signal: AbortSignal,
  concurrency: number,
): Promise<RegionOrders> {
  const results = await settleInPool(
    regionIds.length,
    concurrency,
    signal,
    (index) => fetchRegionOrders(regionIds[index] ?? 0, typeId, signal),
  );

  const orders: RegionOrders = {};
  results.forEach((result, index) => {
    const regionId = regionIds[index];
    if (regionId !== undefined && result?.status === "fulfilled") {
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
    // Aborting stops the requests themselves, not just their results: switching
    // types used to leave every region of the previous type still downloading.
    const controller = new AbortController();
    const { hubs, rest } = splitMarketHubs(regionIds);

    // Orders are committed in two batches — the hubs, then the long tail —
    // rather than one state update per region as it lands. The order tables page
    // at 20 rows, so per-region commits used to grow them a few rows at a time,
    // and every one of those steps shifted everything below the table down. That
    // was the bulk of the market page's Cumulative Layout Shift.
    void (async () => {
      const hubOrders = await fetchRegionsOrders(
        hubs,
        typeId,
        controller.signal,
        hubs.length,
      );
      if (isCancelled()) return;
      setState({ typeId, hubsLoaded: true, orders: hubOrders });

      const restOrders = await fetchRegionsOrders(
        rest,
        typeId,
        controller.signal,
        REGION_CONCURRENCY,
      );
      if (isCancelled()) return;
      setState({
        typeId,
        hubsLoaded: true,
        orders: { ...hubOrders, ...restOrders },
      });
    })();

    // Abort what is in flight, and make sure nothing that still lands ends up
    // in the next type's order tables.
    return () => {
      cancelled = true;
      controller.abort();
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
