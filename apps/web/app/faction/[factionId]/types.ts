/**
 * Everything the faction page shows, resolved on the server from our own
 * database and handed to the client page as plain, serializable props.
 *
 * Split in two by how often it changes: {@link FactionSdeData} is static game
 * data, rewritten only when a new SDE build is ingested, while
 * {@link FactionLiveData} comes from the ESI jobs (NPC corporation membership,
 * LP stores, Faction Warfare enlistment and sovereignty) and changes hourly.
 */

export interface FactionLocation {
  solarSystemId: number;
  name: string;
  securityStatus: number;
  constellationId: number;
  constellationName: string;
  regionId: number | null;
  regionName: string | null;
}

export interface FactionSolarSystemRow extends FactionLocation {
  /** NPC stations in the system. */
  stations: number;
  isHub: boolean;
  isBorder: boolean;
  isFringe: boolean;
  isCorridor: boolean;
}

export interface FactionNamedEntity {
  id: number;
  name: string;
}

export interface FactionRegionRow {
  regionId: number;
  name: string;
  /** The SDE assigns the region as a whole to this faction. */
  isFactionRegion: boolean;
  /** Constellations of the region the SDE gives to this faction. */
  constellations: number;
  /** Solar systems of the region the SDE gives to this faction. */
  systems: number;
}

export interface FactionItemRow {
  typeId: number;
  name: string;
  published: boolean;
  groupId: number;
  groupName: string;
  categoryId: number;
  categoryName: string;
  metaGroupName: string | null;
}

export interface FactionContrabandRow {
  typeId: number;
  name: string;
  /** Fine, as a fraction of the item's value. */
  fineByValue: number;
  standingLoss: number;
  /** Customs confiscate it in systems of this security or above. */
  confiscateMinSec: number;
  /** Customs open fire in systems of this security or above. */
  attackMinSec: number;
}

export interface FactionMissionRow {
  missionId: number;
  name: string;
  kind: "Encounter" | "Courier" | "Other";
  rewardTypeId: number | null;
  rewardTypeName: string | null;
  rewardQuantity: number | null;
  hasStandingRewards: boolean;
}

export interface FactionEpicArcRow {
  epicArcId: number;
  name: string;
  iconId: number | null;
  missions: number;
}

export interface FactionDungeonRow {
  dungeonId: number;
  name: string;
}

export interface FactionSkillPlanRow {
  skillPlanId: number;
  name: string;
  /** Plain text: the SDE's markup (fitting links, line breaks) stripped. */
  description: string;
  skills: number;
}

export interface FactionStandingRestrictionRow {
  stationServiceId: number;
  serviceName: string | null;
  minimumStanding: number;
}

export interface FactionStarbaseCharter {
  typeId: number;
  name: string;
  /** Lowest security at which a control tower must burn the charter. */
  minSecurityLevel: number | null;
}

export interface FactionRaceRow {
  raceId: number;
  name: string;
  iconId: number | null;
  /** The race's own faction, the empire it belongs to. */
  isHomeRace: boolean;
}

export interface FactionSdeData {
  factionId: number;
  name: string;
  description: string;
  shortDescription: string | null;
  isUnique: boolean;
  sizeFactor: number;
  stationCount: number;
  stationSystemCount: number;
  iconId: number | null;
  corporation: FactionNamedEntity | null;
  militiaCorporation: FactionNamedEntity | null;
  homeSystem: FactionLocation | null;
  races: FactionRaceRow[];
  regions: FactionRegionRow[];
  constellations: number;
  systems: FactionSolarSystemRow[];
  items: FactionItemRow[];
  contraband: FactionContrabandRow[];
  missions: FactionMissionRow[];
  epicArcs: FactionEpicArcRow[];
  dungeons: FactionDungeonRow[];
  skillPlans: FactionSkillPlanRow[];
  standingRestrictions: FactionStandingRestrictionRow[];
  starbaseCharters: FactionStarbaseCharter[];
}

export interface FactionCorporationRow {
  corporationId: number;
  name: string;
  ticker: string;
  memberCount: number;
  /** Size band (T/S/L/M/H). */
  size: string | null;
  extent: string | null;
  stations: number;
  lpOffers: number;
  /** The NPC corporation is this faction's militia. */
  isMilitia: boolean;
}

export interface FactionEnlistedCorporationRow {
  corporationId: number;
  name: string;
  ticker: string;
  memberCount: number;
  allianceId: number | null;
  allianceName: string | null;
}

export interface FactionEnlistedAllianceRow {
  allianceId: number;
  name: string;
  ticker: string;
}

export interface FactionSovereigntySystemRow extends FactionLocation {
  /** The SDE assigns this system to the faction too. */
  isHomeTerritory: boolean;
}

export interface FactionLostSystemRow extends FactionLocation {
  /** Who holds it now: another faction, an alliance, or nobody. */
  occupierFactionId: number | null;
  occupierFactionName: string | null;
  occupierAllianceId: number | null;
  occupierAllianceName: string | null;
}

export interface FactionLiveData {
  corporations: FactionCorporationRow[];
  /** The largest enlisted player corporations, by members. */
  enlistedCorporations: FactionEnlistedCorporationRow[];
  /** Every enlisted player corporation, not just those listed. */
  enlistedCorporationCount: number;
  /** Members of every enlisted player corporation. */
  enlistedPilots: number;
  enlistedAlliances: FactionEnlistedAllianceRow[];
  /** Systems ESI's sovereignty map currently gives to this faction. */
  sovereignty: FactionSovereigntySystemRow[];
  /** Systems the SDE gives to this faction that someone else now holds. */
  lostSystems: FactionLostSystemRow[];
}

/**
 * The rows behind the page's tables. They are most of the data (an empire's
 * territory alone is 700 rows) and only the tabs that list them need them, so
 * the page ships without them and fetches them from `/api/faction/[factionId]`
 * when one of those tabs opens. The enlisted militia list is not among them:
 * at 250 rows it is a fraction of the rest, and it is all the Warfare tab
 * needs, so it stays on the page rather than have that tab fetch every table.
 */
export interface FactionTables {
  systems: FactionSolarSystemRow[];
  items: FactionItemRow[];
  contraband: FactionContrabandRow[];
  missions: FactionMissionRow[];
  dungeons: FactionDungeonRow[];
  standingRestrictions: FactionStandingRestrictionRow[];
  corporations: FactionCorporationRow[];
  sovereignty: FactionSovereigntySystemRow[];
  lostSystems: FactionLostSystemRow[];
}

/** What the page itself carries: everything but the table rows, and their counts. */
export interface FactionPageData {
  faction: Omit<FactionSdeData, keyof FactionTables>;
  live: Omit<FactionLiveData, keyof FactionTables>;
  /** Rows per table, for the tab badges and the overview. */
  counts: Record<keyof FactionTables, number> & {
    /** Systems it holds by the SDE or by sovereignty today, each once. */
    territory: number;
  };
}
