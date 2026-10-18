import type { GetWarsWarIdQueryResponse } from "@jitaspace/esi-client";

import type { EsiKillmail, KillmailCardTag } from "~/components/Killmails";

export type EsiWar = GetWarsWarIdQueryResponse;

/** A side of a war: an alliance or a corporation, never both. */
export interface WarParty {
  alliance_id?: number;
  corporation_id?: number;
}

export type WarSideKey = "aggressor" | "defender";

/**
 * The two sides' accents, as `/active-wars` draws them (`WarRoom.module.css`):
 * the aggressor warm, the defender cool.
 */
export const WAR_SIDE_COLOR: Record<WarSideKey, string> = {
  aggressor: "#d1795c",
  defender: "#5f9cba",
};

export const WAR_SIDE_LABEL: Record<WarSideKey, string> = {
  aggressor: "Aggressor",
  defender: "Defender",
};

function isParty(
  victim: EsiKillmail["victim"],
  party: WarParty | undefined,
): boolean {
  if (!party) return false;
  if (party.alliance_id !== undefined)
    return victim.alliance_id === party.alliance_id;
  return (
    party.corporation_id !== undefined &&
    victim.corporation_id === party.corporation_id
  );
}

/**
 * Whose loss a killmail was in this war: the aggressor's, the defender's, or
 * an ally's (allies fight on the defender's side). Undefined when the victim
 * belongs to none of them, which ESI's war killmails should not contain.
 */
export function lossTag(
  war: EsiWar | undefined,
  killmail: EsiKillmail,
): KillmailCardTag | undefined {
  if (!war) return undefined;
  const { victim } = killmail;
  if (isParty(victim, war.aggressor))
    return { label: "Aggressor loss", color: WAR_SIDE_COLOR.aggressor };
  if (isParty(victim, war.defender))
    return { label: "Defender loss", color: WAR_SIDE_COLOR.defender };
  if (war.allies?.some((ally) => isParty(victim, ally)))
    return { label: "Ally loss", color: WAR_SIDE_COLOR.defender };
  return undefined;
}
