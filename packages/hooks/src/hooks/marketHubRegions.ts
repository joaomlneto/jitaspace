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
