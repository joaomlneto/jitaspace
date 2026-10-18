import type { KillmailsKillmailIdKillmailHashGet } from "@jitaspace/esi-client";

/** The killmail as ESI serves it. */
export type EsiKillmail = KillmailsKillmailIdKillmailHashGet;

/** What zKillboard adds to a killmail: its valuation and a few flags. */
export interface ZkbKillmailMeta {
  hash: string;
  locationID?: number;
  fittedValue?: number;
  droppedValue?: number;
  destroyedValue?: number;
  totalValue?: number;
  points?: number;
  npc?: boolean;
  solo?: boolean;
  awox?: boolean;
  labels?: string[];
}

/**
 * A killmail from zKillboard's list endpoints (`/api/warID/…`), which inline
 * the full ESI killmail beside the `zkb` block, so a list renders without one
 * ESI request per kill.
 */
export type ZkbKillmail = EsiKillmail & { zkb: ZkbKillmailMeta };

/** zKillboard's list endpoints return at most this many killmails per page. */
export const ZKB_PAGE_SIZE = 200;

/** zKillboard's kills for a war, newest first, one page of 200 at a time. */
export const zkillboardWarKillsUrl = (warId: number, page: number) =>
  `https://zkillboard.com/api/warID/${warId}/page/${page}/`;

/** Where a kill is on zKillboard and EVE-Kill. */
export const zkillboardKillUrl = (killmailId: number) =>
  `https://zkillboard.com/kill/${killmailId}/`;
export const eveKillKillUrl = (killmailId: number) =>
  `https://eve-kill.com/kill/${killmailId}`;

/** Our own killmail page; the hash spares it a zKillboard lookup. */
export const killmailPagePath = (killmailId: number, hash?: string) =>
  hash
    ? `/kill/${killmailId}?hash=${encodeURIComponent(hash)}`
    : `/kill/${killmailId}`;
