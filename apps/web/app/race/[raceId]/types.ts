/**
 * Everything the race page shows, resolved on the server from our own database
 * and handed to the client page as plain, serializable props.
 *
 * The page carries the race itself and everything small about it; the three
 * long lists (every item the SDE assigns to the race, its NPC corporations and
 * its stations) are served by `/api/race/[raceId]/[table]` and fetched when the
 * tab listing them opens. See {@link RaceTables}.
 */

import type { CHARACTER_ATTRIBUTES } from "./constants";

export interface RaceNamedEntity {
  id: number;
  name: string;
}

export type CharacterAttribute = (typeof CHARACTER_ATTRIBUTES)[number];

export type RaceAttributeValues = Record<CharacterAttribute, number>;

export interface RaceLocation {
  solarSystemId: number;
  name: string;
  securityStatus: number;
  regionId: number | null;
  regionName: string | null;
}

export interface RaceAncestryRow {
  ancestryId: number;
  name: string;
  shortDescription: string | null;
  description: string;
  iconId: number | null;
  /** Points the ancestry adds to each attribute (the SDE omits the zeros). */
  bonuses: RaceAttributeValues;
}

export interface RaceBloodlineRow {
  bloodlineId: number;
  name: string;
  description: string;
  iconId: number | null;
  corporation: RaceNamedEntity | null;
  /** The bloodline's corvette, from ESI's bloodline record. */
  shipType: RaceNamedEntity | null;
  attributes: RaceAttributeValues;
  ancestries: RaceAncestryRow[];
}

export interface RaceFactionRow {
  factionId: number;
  name: string;
  /** The race's own faction, per ESI's race record. */
  isHomeFaction: boolean;
  /** factions.yaml lists the race among the faction's member races. */
  isMemberRace: boolean;
}

export interface RaceSchoolStation extends RaceLocation {
  stationId: number;
  stationName: string;
}

export interface RaceSchoolRow {
  schoolId: number;
  name: string;
  /** The school's division, e.g. "Center for Combat Studies". */
  title: string | null;
  description: string | null;
  /** How the game describes the school's graduates. */
  characterDescription: string | null;
  iconId: number | null;
  corporation: RaceNamedEntity | null;
  /** The New Player Experience copy of a school, which starts elsewhere. */
  isStarterSpaceSchool: boolean;
  /** Where the school is (schoolMap.yaml); only the original schools have one. */
  homeSystem: RaceLocation | null;
  startingStations: RaceSchoolStation[];
  careerAgents: RaceNamedEntity[];
}

export interface RaceSkillRow {
  typeId: number;
  name: string;
  groupId: number;
  groupName: string;
  published: boolean;
  /** The skill's training time multiplier; null when the SDE has none. */
  rank: number | null;
  primaryAttribute: CharacterAttribute | null;
  secondaryAttribute: CharacterAttribute | null;
}

export interface RaceStartingSkillRow extends RaceSkillRow {
  /** 0 is injected but untrained. */
  level: number;
  /** Skill points at that level, from the rank; null without one. */
  skillPoints: number | null;
}

export interface RaceCloneSkillRow extends RaceSkillRow {
  /** The highest level an Alpha clone may train it to. */
  maxLevel: number;
}

export interface RaceCloneGrade {
  cloneGradeId: number;
  name: string;
  skills: RaceCloneSkillRow[];
}

export interface RaceShipRow {
  typeId: number;
  name: string;
  metaGroupName: string | null;
}

/** One ship class (an inventory group), with the race's published hulls in it. */
export interface RaceShipClass {
  groupId: number;
  name: string;
  ships: RaceShipRow[];
}

export interface RaceStationTypeRow {
  typeId: number;
  name: string;
  /** The station operations that use this type for the race, by name. */
  operations: string[];
}

export interface RaceCategoryCount {
  categoryId: number;
  name: string;
  /** Every item of the category with this race. */
  total: number;
  /** Of those, the ones the game publishes. */
  published: number;
}

export interface RaceAgentCount {
  id: number;
  name: string;
  count: number;
}

export interface RaceAgentSummary {
  /** NPC agents of this race. */
  total: number;
  locators: number;
  /** Agents at each level, 1 to 5; levels without agents are left out. */
  byLevel: { level: number; count: number }[];
  /** By corporation division (Security, Distribution, …), most first. */
  byDivision: RaceAgentCount[];
  /** By agent type (Basic, Research, Event, …), most first. */
  byType: RaceAgentCount[];
}

export interface RacePageData {
  raceId: number;
  name: string;
  description: string;
  iconId: number | null;
  /** The race's own faction, from ESI; only the four empires have one. */
  faction: RaceNamedEntity | null;
  /** The ship a new character of this race starts in. */
  starterShip: RaceNamedEntity | null;
  factions: RaceFactionRow[];
  bloodlines: RaceBloodlineRow[];
  schools: RaceSchoolRow[];
  startingSkills: RaceStartingSkillRow[];
  cloneGrade: RaceCloneGrade | null;
  /** Skills the SDE assigns to this race, such as its ship skills. */
  racialSkills: RaceSkillRow[];
  /** Published hulls, by class, the smallest classes first. */
  shipClasses: RaceShipClass[];
  /** The race's items by category, most first. */
  itemCategories: RaceCategoryCount[];
  /** The station architecture the race builds, per station operation. */
  stationTypes: RaceStationTypeRow[];
  agents: RaceAgentSummary;
  /** Rows behind each fetched table, for the tab badges and the overview. */
  counts: Record<keyof RaceTables, number>;
}

export interface RaceItemRow {
  typeId: number;
  name: string;
  published: boolean;
  groupId: number;
  groupName: string;
  categoryId: number;
  categoryName: string;
  metaGroupName: string | null;
  techLevel: number | null;
}

export interface RaceCorporationRow {
  corporationId: number;
  name: string;
  ticker: string;
  memberCount: number;
  factionId: number | null;
  factionName: string | null;
  /** Size band (T/S/L/M/H). */
  size: string | null;
  extent: string | null;
  stations: number;
  lpOffers: number;
  /** The SDE gives the corporation this race. */
  isRaceCorporation: boolean;
  /** The corporation lists this race among those allowed to join it. */
  acceptsRace: boolean;
}

export interface RaceStationRow extends RaceLocation {
  stationId: number;
  stationName: string;
  typeId: number;
  typeName: string;
  ownerId: number | null;
  ownerName: string | null;
}

/** The tables `/api/race/[raceId]/[table]` serves, one per path. */
export interface RaceTables {
  items: RaceItemRow[];
  corporations: RaceCorporationRow[];
  stations: RaceStationRow[];
}

export type RaceTableName = keyof RaceTables;
