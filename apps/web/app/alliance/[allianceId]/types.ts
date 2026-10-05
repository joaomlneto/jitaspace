import type { CorporationSummary } from "./corporations";
import type { SovereigntySummary } from "./sovereignty";
import type { EntityWar, WarSummary } from "~/lib/warRecord";

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

export type {
  EntityWar as AllianceWar,
  EntityWarStatus as AllianceWarStatus,
  WarRole as AllianceWarRole,
  WarSummary as AllianceWarSummary,
} from "~/lib/warRecord";

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
  wars: EntityWar[];
  warSummary: WarSummary;
  /** When the read was taken: the page's "now" for anything time-relative. */
  readAt: string;
}

/** The rows behind the page's tables, served by `/api/alliance/[allianceId]`. */
export type AllianceTables = Pick<
  AllianceProfile,
  "corporations" | "sovereignty" | "wars"
>;

/** One corporation in the overview's pilot-composition bar. */
export interface CompositionEntry {
  corporationId: number;
  name: string;
  ticker: string;
  memberCount: number;
}

/**
 * What the page itself carries: the profile without its table rows, plus the
 * summaries the overview and hero show, computed on the server. The rows are
 * most of the page's weight (Goonswarm's 809 corporations and 509 systems made
 * it ~700 kB), so a tab fetches them only when it opens.
 */
export type AlliancePageData = Omit<AllianceProfile, keyof AllianceTables> & {
  corporationSummary: CorporationSummary;
  /** The largest corporations by pilots, largest first. */
  composition: CompositionEntry[];
  executorCeo: { id: number; name: string | null } | null;
  creatorStillMember: boolean;
  sovereigntySummary: SovereigntySummary;
  /** How many wars the Wars tab lists (at most `ALLIANCE_WAR_LIST_LIMIT`). */
  listedWars: number;
};
