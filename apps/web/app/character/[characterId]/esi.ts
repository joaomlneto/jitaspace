import { cacheLife, cacheTag } from "next/cache";

import { getCharactersDetail } from "@jitaspace/esi-client";

import type { EsiCharacterCard } from "./types";
import { isEsiNotFound } from "~/lib/esiNotFound";

/** Tag on one character's ESI card. */
export const characterCacheTag = (characterId: number) =>
  `character:${characterId}`;

/**
 * ESI's public sheet for the character, or null when ESI says the character
 * does not exist. That 404 is a genuine absence, so caching it is correct; any
 * other failure throws and is never cached. The corporation and alliance come
 * unnamed: the page names them outside this scope (`nameAffiliations`), so a
 * failed name lookup is never cached with the sheet.
 *
 * The page is cached whole (ISR), and under `cacheComponents` an uncached read
 * (these go through axios) would make every render request-time.
 */
export async function readEsiCharacter(
  characterId: number,
): Promise<EsiCharacterCard | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(characterCacheTag(characterId));

  let data;
  try {
    ({ data } = await getCharactersDetail(characterId));
  } catch (error) {
    if (isEsiNotFound(error)) return null;
    throw error;
  }

  return {
    name: data.name,
    birthday: data.birthday,
    gender: data.gender,
    raceId: data.race_id,
    bloodlineId: data.bloodline_id,
    corporation: { id: data.corporation_id, name: null },
    alliance: data.alliance_id ? { id: data.alliance_id, name: null } : null,
    factionId: data.faction_id ?? null,
    securityStatus: data.security_status ?? null,
    title: data.corporation_title ?? null,
    description: data.description ?? null,
    achievementScore: data.achievement_score,
    readAt: new Date().toISOString(),
  };
}
