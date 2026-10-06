import { cacheLife, cacheTag } from "next/cache";

import {
  getAlliancesAllianceId,
  getCorporationsCorporationId,
} from "@jitaspace/esi-client";

import { allianceCacheTag } from "~/lib/alliancesCache";
import { isEsiNotFound } from "~/lib/esiNotFound";

/**
 * The ESI reads behind the page's metadata. The page is cached whole (ISR),
 * and under `cacheComponents` an uncached read — these go through axios —
 * would make every render request-time instead.
 *
 * Both throw on failure; `generateMetadata` catches outside the cache scope,
 * so an ESI blip is never what gets cached.
 */

export interface EsiAllianceCard {
  name: string;
  ticker: string;
  dateFounded: string;
  executorCorporationId: number | null;
}

/**
 * The alliance as ESI describes it, or null when ESI says it does not exist.
 * That 404 is a genuine absence, so caching it is correct; any other failure
 * throws and is never cached.
 */
export async function readEsiAlliance(
  allianceId: number,
): Promise<EsiAllianceCard | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(allianceCacheTag(allianceId));
  let data;
  try {
    ({ data } = await getAlliancesAllianceId(allianceId));
  } catch (error) {
    if (isEsiNotFound(error)) return null;
    throw error;
  }
  return {
    name: data.name,
    ticker: data.ticker,
    dateFounded: data.date_founded,
    executorCorporationId: data.executor_corporation_id ?? null,
  };
}

export async function readEsiCorporationName(
  corporationId: number,
): Promise<string> {
  "use cache";
  // Hours, like the alliance read: a renamed executor should reach the card
  // within the hour, as the rest of it does.
  cacheLife("hours");
  const { data } = await getCorporationsCorporationId(corporationId);
  return data.name;
}
