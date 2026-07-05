/**
 * Shared types for the Active Wars view.
 *
 * The server (active-wars/page.tsx) reads raw wars from the local database and
 * enriches each with a handful of derived, deterministic fields (status, totals,
 * ISK share) so the client can render, sort and filter without recomputing
 * anything time-sensitive (which would risk hydration mismatches). All dates
 * cross the server→client boundary as ISO strings.
 *
 * Lifecycle terms shown to users: pending → "Starting", active → "Active",
 * retracting → "Ending". A retracting war is still shooting until it finishes.
 */

export type WarStatus = "pending" | "active" | "retracting";

export interface WarRoomWar {
  warId: number;

  // Belligerents — exactly one of corporation/alliance id is set per side.
  aggressorCorporationId?: number;
  aggressorAllianceId?: number;
  aggressorIskDestroyed: number;
  aggressorShipsKilled: number;
  defenderCorporationId?: number;
  defenderAllianceId?: number;
  defenderIskDestroyed: number;
  defenderShipsKilled: number;

  allianceAllies: number[];
  corporationAllies: number[];

  declaredDate: string;
  startedDate?: string;
  finishedDate?: string;
  retractedDate?: string;
  isMutual: boolean;
  isOpenForAllies: boolean;
  updatedAt: string;

  // ---- Derived (computed server-side, frozen at cache time) ----
  status: WarStatus;
  /** aggressorIskDestroyed + defenderIskDestroyed (ISK value both sides wrecked) */
  totalIskDestroyed: number;
  /** aggressorShipsKilled + defenderShipsKilled */
  totalShipsKilled: number;
  /** How long the war has been shooting, in days (0 while still starting). */
  ageDays: number;
  /** Aggressor's share (0–1) of total ISK destroyed, or null if no combat yet. */
  aggressorIskShare: number | null;
}

/** A belligerent aggregated across every war it is currently prosecuting. */
export interface WarRoomAggressor {
  corporationId?: number;
  allianceId?: number;
  warCount: number;
  iskDestroyed: number;
  shipsKilled: number;
}

export interface WarRoomStats {
  totalActive: number;
  /** Shooting now (started, not winding down). */
  activeCount: number;
  /** Declared but not yet shooting (24h prep). */
  startingCount: number;
  /** One side has withdrawn — still shooting until it finishes. */
  endingCount: number;
  mutualCount: number;
  openForAlliesCount: number;
  totalIskDestroyed: number;
  totalShipsKilled: number;
  /** Wars with at least one kill on record. */
  warsWithCombat: number;
  declaredLast24h: number;
  declaredLast7d: number;
  /** When this snapshot was computed (ISO). */
  generatedAt: string;
}

export interface WarRoomData {
  stats: WarRoomStats;
  wars: WarRoomWar[];
  topAggressors: WarRoomAggressor[];
}
