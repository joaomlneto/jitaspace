/**
 * An alliance's or corporation's wars, as its page shows them: each war from
 * the entity's own side. Plain serializable types, safe for client code; the
 * database read is `readWarRecord` (`lib/readWarRecord.ts`).
 */

/** How many wars a page lists. The summary still counts all of them. */
export const WAR_LIST_LIMIT = 500;

/** The entity's part in a war. An ally fights on the defender's side. */
export type WarRole = "aggressor" | "defender" | "ally";

/**
 * Lifecycle at the time of the read: declared but not yet shooting, shooting,
 * one side withdrew but still shooting, or over.
 */
export type EntityWarStatus = "pending" | "active" | "retracting" | "finished";

export interface EntityWar {
  warId: number;
  role: WarRole;
  status: EntityWarStatus;
  aggressorAllianceId: number | null;
  aggressorCorporationId: number | null;
  defenderAllianceId: number | null;
  defenderCorporationId: number | null;
  aggressorShipsKilled: number;
  aggressorIskDestroyed: number;
  defenderShipsKilled: number;
  defenderIskDestroyed: number;
  declaredDate: string;
  startedDate: string | null;
  finishedDate: string | null;
  retractedDate: string | null;
  isMutual: boolean;
  isOpenForAllies: boolean;
  /** Alliances and corporations that joined the defender. */
  allyCount: number;
}

/** Totals over every war on record, not only those listed. */
export interface WarSummary {
  total: number;
  asAggressor: number;
  asDefender: number;
  asAlly: number;
  /** Not yet finished: pending, active or retracting. */
  ongoing: number;
  /** Ships and ISK the entity's side destroyed, as aggressor or defender. */
  shipsKilled: number;
  iskDestroyed: number;
  /** Ships and ISK the other side destroyed. */
  shipsLost: number;
  iskLost: number;
}

/** Whose wars: an alliance's, or a corporation's own (not its alliance's). */
export interface WarParty {
  kind: "alliance" | "corporation";
  id: number;
}
