/**
 * What the alliance page reads from our own database, resolved on the server
 * and handed to the client page as plain, serializable props. Dates cross the
 * boundary as ISO strings.
 *
 * The hourly `esi-update-alliances` job keeps these rows current. ESI is still
 * read on the client — for the alliance's creator, which we do not store, and
 * as the whole page when this read is unavailable.
 */

export interface AllianceCorporation {
  corporationId: number;
  name: string;
  ticker: string;
  memberCount: number;
  ceoId: number | null;
  /** Null when the CEO is not in our character table. */
  ceoName: string | null;
  dateFounded: string | null;
  /** 0–1. */
  taxRate: number;
  warEligible: boolean | null;
  /** The Faction Warfare militia the corporation is enlisted with. */
  enlistedFactionId: number | null;
  homeStationId: number | null;
  homeStationName: string | null;
  url: string | null;
}

export interface AllianceSovereigntySystem {
  solarSystemId: number;
  name: string;
  securityStatus: number;
  constellationId: number;
  constellationName: string;
  regionId: number | null;
  regionName: string | null;
  /** The alliance corporation holding the claim. */
  corporationId: number | null;
  claimedSince: string | null;
  isCapitalSystem: boolean;
  /** A 64-bit structure id, so a string. */
  sovereigntyHubId: string | null;
  /** Null while the hub is in an active campaign. */
  vulnerabilityWindowStart: string | null;
  vulnerabilityWindowEnd: string | null;
  activityDefenseMultiplier: number | null;
  militaryLevel: number | null;
  industrialLevel: number | null;
  strategicLevel: number | null;
}

/** The alliance's part in a war. An ally fights on the defender's side. */
export type AllianceWarRole = "aggressor" | "defender" | "ally";

/**
 * Lifecycle at the time of the read: declared but not yet shooting, shooting,
 * one side withdrew but still shooting, or over.
 */
export type AllianceWarStatus =
  | "pending"
  | "active"
  | "retracting"
  | "finished";

export interface AllianceWar {
  warId: number;
  role: AllianceWarRole;
  status: AllianceWarStatus;
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
export interface AllianceWarSummary {
  total: number;
  asAggressor: number;
  asDefender: number;
  asAlly: number;
  /** Not yet finished: pending, active or retracting. */
  ongoing: number;
  /** Ships and ISK the alliance's side destroyed, as aggressor or defender. */
  shipsKilled: number;
  iskDestroyed: number;
  /** Ships and ISK the other side destroyed. */
  shipsLost: number;
  iskLost: number;
}

export interface AllianceProfile {
  allianceId: number;
  name: string;
  ticker: string;
  dateFounded: string;
  /** ESI stopped listing the alliance: it closed. */
  isClosed: boolean;
  creatorCorporationId: number;
  creatorCorporationName: string | null;
  executorCorporationId: number | null;
  executorCorporationName: string | null;
  factionId: number | null;
  factionName: string | null;
  corporations: AllianceCorporation[];
  sovereignty: AllianceSovereigntySystem[];
  /** The most recently declared wars, newest first. */
  wars: AllianceWar[];
  warSummary: AllianceWarSummary;
  /** When the read was taken: the page's "now" for anything time-relative. */
  readAt: string;
}
