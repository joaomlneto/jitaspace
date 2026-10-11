"use client";

import { useGetMarketsRegionIdTypes } from "@jitaspace/esi-client";

import { GLOBAL_MARKET_REGION_ID } from "./marketHubRegions";

/**
 * Whether a type trades on the global PLEX market, and so nowhere else, from
 * the types ESI lists there (today, only PLEX). Only the first page is read:
 * the list is one type long, and ESI pages it by the thousand.
 *
 * `undefined` until ESI has answered, and `false` if it could not. It is not
 * retried: every market page waits on this answer, and treating a type as an
 * ordinary one is a better fallback than holding the page back.
 */
export function useTradesOnGlobalMarket(typeId?: number): boolean | undefined {
  const { data, isError } = useGetMarketsRegionIdTypes(
    GLOBAL_MARKET_REGION_ID,
    undefined,
    undefined,
    { query: { enabled: typeId !== undefined, retry: false } },
  );
  if (typeId === undefined) return undefined;
  if (data) return data.data.includes(typeId);
  return isError ? false : undefined;
}
