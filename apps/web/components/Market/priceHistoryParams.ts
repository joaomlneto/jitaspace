import { parseAsInteger, parseAsStringLiteral } from "nuqs";

import { MARKET_HUB_REGION_IDS } from "@jitaspace/hooks";

import { PRICE_HISTORY_RANGES } from "./priceHistory";

/**
 * The price history tab's URL state, shared so the market page can clear it
 * when the reader leaves the tab. Namespaced (`historyRegion`,
 * `historyRange`): the chart lives in ~/components, and a host page may own a
 * `region` or `range` of its own.
 */

/** The region charted for a type that does not trade on the global market. */
export const DEFAULT_HISTORY_REGION_ID = MARKET_HUB_REGION_IDS[0] ?? 10000002;

export const priceHistoryParsers = {
  // No default here: which region a type opens on depends on the type (PLEX
  // trades only on the global market), so `null` means "the type's default".
  region: parseAsInteger,
  range: parseAsStringLiteral(PRICE_HISTORY_RANGES).withDefault("6m"),
};

export const priceHistoryUrlKeys = {
  region: "historyRegion",
  range: "historyRange",
} as const;
