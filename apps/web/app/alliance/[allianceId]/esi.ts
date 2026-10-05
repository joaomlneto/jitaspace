import { cacheLife, cacheTag } from "next/cache";

import {
  getAlliancesAllianceId,
  getCorporationsCorporationId,
} from "@jitaspace/esi-client";

import { allianceCacheTag } from "~/lib/alliancesCache";

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

export async function readEsiAlliance(
  allianceId: number,
): Promise<EsiAllianceCard> {
  "use cache";
  cacheLife("hours");
  cacheTag(allianceCacheTag(allianceId));
  const { data } = await getAlliancesAllianceId(allianceId);
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
