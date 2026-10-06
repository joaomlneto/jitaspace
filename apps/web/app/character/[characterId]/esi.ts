import { cacheLife, cacheTag } from "next/cache";

import { getCharactersDetail } from "@jitaspace/esi-client";

import type { EsiCharacterCard } from "./types";
import { readEsiAlliance } from "~/app/alliance/[allianceId]/esi";
import { readEsiCorporation } from "~/app/corporation/[corporationId]/esi";
import { isEsiNotFound } from "~/lib/esiNotFound";

/** Tag on one character's ESI card. */
export const characterCacheTag = (characterId: number) =>
  `character:${characterId}`;

/** A name for an affiliation, or null: the card is never worth failing over. */
async function nameOrNull(
  read: () => Promise<{ name: string } | null>,
): Promise<string | null> {
  try {
    return (await read())?.name ?? null;
  } catch {
    return null;
  }
}

/**
 * ESI's public sheet for the character, with its corporation and alliance
 * named, or null when ESI says the character does not exist. That 404 is a
 * genuine absence, so caching it is correct; any other failure of the sheet
 * itself throws and is never cached.
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

  const allianceId = data.alliance_id;
  const [corporationName, allianceName] = await Promise.all([
    nameOrNull(() => readEsiCorporation(data.corporation_id)),
    allianceId ? nameOrNull(() => readEsiAlliance(allianceId)) : null,
  ]);

  return {
    name: data.name,
    birthday: data.birthday,
    gender: data.gender,
    raceId: data.race_id,
    bloodlineId: data.bloodline_id,
    corporation: { id: data.corporation_id, name: corporationName },
    alliance: allianceId ? { id: allianceId, name: allianceName } : null,
    factionId: data.faction_id ?? null,
    securityStatus: data.security_status ?? null,
    title: data.corporation_title ?? null,
    description: data.description ?? null,
    achievementScore: data.achievement_score,
    readAt: new Date().toISOString(),
  };
}
