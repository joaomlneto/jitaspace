import { cacheLife, cacheTag } from "next/cache";

import {
  getAlliancesAllianceId,
  getCorporationsCorporationId,
} from "@jitaspace/esi-client";

import { corporationCacheTag } from "./ids";

/**
 * The ESI reads behind the page's metadata. The page is cached whole (ISR),
 * and under `cacheComponents` an uncached read (these go through axios)
 * would make every render request-time instead.
 *
 * Both throw on failure; `generateMetadata` catches outside the cache scope,
 * so an ESI blip is never what gets cached.
 */

export interface EsiCorporationCard {
  name: string;
  ticker: string;
  description: string | null;
  memberCount: number;
  allianceId: number | null;
}

export async function readEsiCorporation(
  corporationId: number,
): Promise<EsiCorporationCard> {
  "use cache";
  cacheLife("hours");
  cacheTag(corporationCacheTag(corporationId));
  const { data } = await getCorporationsCorporationId(corporationId);
  return {
    name: data.name,
    ticker: data.ticker,
    description: data.description === "" ? null : data.description,
    memberCount: data.member_count,
    allianceId: data.alliance_id ?? null,
  };
}

export async function readEsiAllianceName(allianceId: number): Promise<string> {
  "use cache";
  cacheLife("hours");
  const { data } = await getAlliancesAllianceId(allianceId);
  return data.name;
}
