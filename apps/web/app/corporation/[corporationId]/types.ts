import type { Agent } from "~/components/Agents";
import type { NamedRef } from "~/lib/namedRef";
import type { EntityWar, WarSummary } from "~/lib/warRecord";

/**
 * What the corporation page reads from our own database, resolved on the
 * server and handed to the client page as plain, serializable props. Dates
 * cross the boundary as ISO strings.
 *
 * Player corporations come from ESI scrapes, NPC corporations from the SDE.
 * ESI is still read on the client, for fresher volatile fields (members, CEO,
 * alliance, tax) and as the whole page when this read is unavailable.
 */

export type { NamedRef } from "~/lib/namedRef";

/** A corporation holding another's shares, or held by it. */
export interface Shareholding {
  corporationId: number;
  name: string;
  shares: number;
}

export interface ExchangeRate {
  corporationId: number;
  name: string;
  rate: number;
}

export interface NpcDivision {
  divisionId: number;
  name: string;
  /** The division's size band, 1 (smallest) upwards. */
  size: number | null;
  leaderId: number | null;
}

/** The SDE's description of an NPC corporation; null for player ones. */
export interface NpcCorporationDetails {
  faction: NamedRef | null;
  /** Size band: T(iny), S(mall), M(edium), L(arge), H(uge). */
  size: string | null;
  sizeFactor: number | null;
  /** Territorial extent: G(lobal), N(ational), R(egional), C(onstellation), L(ocal). */
  extent: string | null;
  memberLimit: number | null;
  minSecurity: number | null;
  minimumJoinStanding: number | null;
  initialPrice: number | null;
  hasPlayerPersonnelManager: boolean | null;
  sendCharTerminationMessage: boolean | null;
  isUnique: boolean | null;
  isDeletedByCcp: boolean | null;
  headquarters: {
    solarSystemId: number;
    name: string;
    securityStatus: number;
    regionId: number | null;
    regionName: string | null;
  } | null;
  race: NamedRef | null;
  allowedRaces: NamedRef[];
  mainActivity: string | null;
  secondaryActivity: string | null;
  enemy: NamedRef | null;
  friend: NamedRef | null;
  divisions: NpcDivision[];
  investors: Shareholding[];
  investedIn: Shareholding[];
  exchangeRates: ExchangeRate[];
  lpOffers: number;
}

export interface CorporationStation {
  stationId: number;
  name: string;
  typeId: number;
  solarSystemId: number | null;
  solarSystemName: string | null;
  securityStatus: number | null;
  regionId: number | null;
  regionName: string | null;
  /** 0–1. */
  reprocessingEfficiency: number;
  officeRentalCost: number | null;
}

/** An item the NPC corporation trades in, and the SDE's value for it. */
export interface CorporationTrade {
  typeId: number;
  typeName: string;
  value: number;
}

export interface CorporationProfile {
  corporationId: number;
  name: string;
  ticker: string;
  description: string | null;
  url: string | null;
  memberCount: number;
  /** 0–1. */
  taxRate: number;
  dateFounded: string | null;
  ceo: NamedRef | null;
  creator: NamedRef | null;
  alliance: NamedRef | null;
  /** The Faction Warfare militia it is enlisted with. */
  enlistedFaction: NamedRef | null;
  homeStation: NamedRef | null;
  /** A 64-bit count, so a string. */
  shares: string | null;
  warEligible: boolean | null;
  npc: NpcCorporationDetails | null;
  stations: CorporationStation[];
  agents: Agent[];
  agentTypes: { name: string; agentTypeId: number }[];
  agentDivisions: { name: string; npcCorporationDivisionId: number }[];
  trades: CorporationTrade[];
  /** The most recently declared wars, newest first. */
  wars: EntityWar[];
  warSummary: WarSummary;
  /** When the read was taken: the page's "now" for anything time-relative. */
  readAt: string;
}

/** The rows behind the page's tables, served by `/api/corporation/[id]`. */
export type CorporationTables = Pick<
  CorporationProfile,
  "stations" | "agents" | "agentTypes" | "agentDivisions" | "trades" | "wars"
>;

/**
 * What the page itself carries: the profile without its table rows, plus how
 * many there are. An NPC corporation can own dozens of stations and employ a
 * hundred agents, so a tab fetches them only when it opens.
 */
export type CorporationPageData = Omit<
  CorporationProfile,
  keyof CorporationTables
> & {
  counts: {
    stations: number;
    agents: number;
    trades: number;
    /** How many wars the Wars tab lists (at most `WAR_LIST_LIMIT`). */
    listedWars: number;
  };
};
