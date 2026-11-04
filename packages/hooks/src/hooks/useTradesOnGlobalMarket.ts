"use client";

import { useState } from "react";

import { useGetMarketsRegionIdTypes } from "@jitaspace/esi-client";

import { GLOBAL_MARKET_REGION_ID } from "./marketHubRegions";

/**
 * Whether a type trades on the global PLEX market, and so nowhere else, from
 * the types ESI lists there (today, only PLEX). Only the first page is read:
 * the list is one type long, and ESI pages it by the thousand.
 *
 * `undefined` until ESI has answered, and `null` if it could not, which callers
 * treat as an ordinary type without taking it as settled. It is not retried:
 * every market page waits on this answer, and treating a type as an ordinary
 * one is a better fallback than holding the page back.
 *
 * The first answer for a type is kept while the caller stays mounted. A refetch
 * that changed it (a failed request that later succeeds) would otherwise
 * restart the order fetch and move the price history off the region it opened
 * on.
 */
export function useTradesOnGlobalMarket(
  typeId?: number,
): boolean | null | undefined {
  const { data, isError } = useGetMarketsRegionIdTypes(
    GLOBAL_MARKET_REGION_ID,
    undefined,
    undefined,
    { query: { enabled: typeId !== undefined, retry: false } },
  );
  const [kept, setKept] = useState<{
    typeId: number;
    answer: boolean | null;
  }>();
  if (typeId === undefined) return undefined;
  if (kept?.typeId === typeId) return kept.answer;

  let answer: boolean | null | undefined;
  if (data) answer = data.data.includes(typeId);
  else if (isError) answer = null;
  // Stored while rendering, as React allows for a component's own state, so
  // the very render that first sees the answer is the one that keeps it.
  if (answer !== undefined) setKept({ typeId, answer });
  return answer;
}
