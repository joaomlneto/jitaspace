/**
 * The major market-hub regions, in rough order of trade volume. Orders for any
 * given type are overwhelmingly concentrated here, so fetching these first lets
 * the (paginated, 20-row) order tables reach their full size almost immediately
 * instead of waiting on the long tail of low-volume regions — which improves the
 * Largest Contentful Paint on the market page. Every region is still fetched;
 * only the order in which the requests are kicked off changes.
 */
export const MARKET_HUB_REGION_IDS: readonly number[] = [
  10000002, // The Forge (Jita)
  10000043, // Domain (Amarr)
  10000032, // Sinq Laison (Dodixie)
  10000030, // Heimatar (Rens)
  10000042, // Metropolis (Hek)
];

/**
 * The global PLEX market: one region that every player trades in, wherever
 * they are, and the only market PLEX trades on. ESI lists the types it carries
 * at `/markets/19000001/types`; its own name, "GPMR-01", means nothing to a
 * reader. Its id sits among the wormhole and Abyssal regions, which have no
 * market at all.
 */
export const GLOBAL_MARKET_REGION_ID = 19000001;

/** Built once, so callers memoising on the list see the same array. */
const HUB_AND_GLOBAL_MARKET_REGION_IDS: readonly number[] = [
  ...MARKET_HUB_REGION_IDS,
  GLOBAL_MARKET_REGION_ID,
];

/**
 * The regions a type's market is looked at first: the hubs, then, for a type
 * that trades on the global PLEX market, that market too. The order tables
 * fetch these before the long tail, and the price history offers them first.
 */
export function marketHubRegionIds(
  tradesOnGlobalMarket: boolean,
): readonly number[] {
  return tradesOnGlobalMarket
    ? HUB_AND_GLOBAL_MARKET_REGION_IDS
    : MARKET_HUB_REGION_IDS;
}
