/**
 * What the character page reads on the server: ESI's public card for the
 * character, and what our database knows (the SDE's NPC characters and
 * agents, and the corporations a character leads or founded). Both cross to
 * the client as plain, serializable props; dates are ISO strings.
 */

export interface NamedRef {
  id: number;
  name: string | null;
}

/** ESI's public character sheet, with its corporation and alliance named. */
export interface EsiCharacterCard {
  name: string;
  birthday: string;
  gender: "male" | "female";
  raceId: number;
  bloodlineId: number;
  corporation: NamedRef;
  alliance: NamedRef | null;
  factionId: number | null;
  securityStatus: number | null;
  title: string | null;
  description: string | null;
  achievementScore: number | null;
  /**
   * When the card was read: the page's "now" for ages and tenures. Taken
   * inside the cached read, because a client component calling `new Date()`
   * while the page prerenders would drop it out of the ISR cache.
   */
  readAt: string;
}

export interface AgentStation {
  stationId: number;
  name: string;
  solarSystemId: number | null;
  solarSystemName: string | null;
  securityStatus: number | null;
  regionId: number | null;
  regionName: string | null;
}

/** An agent that sits in a dungeon in space instead of a station. */
export interface AgentInSpace {
  dungeon: NamedRef;
  solarSystem: NamedRef;
  /** The ship or structure the agent is in. */
  type: NamedRef;
}

export interface AgentDetails {
  agentType: NamedRef;
  division: NamedRef;
  level: number;
  isLocator: boolean;
  isCeo: boolean | null;
  /** When the agent started, per the SDE. */
  startDate: string | null;
  station: AgentStation;
  inSpace: AgentInSpace | null;
  /** The skills a research agent researches, by type. */
  researchSkills: NamedRef[];
}

/** What our database knows about a character, or null when nothing. */
export interface CharacterRecord {
  name: string;
  corporation: NamedRef;
  race: NamedRef;
  bloodline: NamedRef;
  ancestry: NamedRef | null;
  faction: NamedRef | null;
  gender: string;
  title: string | null;
  description: string | null;
  securityStatus: number | null;
  isUnique: boolean | null;
  agent: AgentDetails | null;
  /** Corporations this character is CEO of. */
  ceoOf: NamedRef[];
  /** Corporations this character founded. */
  founded: NamedRef[];
}

export interface CharacterPageData {
  /** Null when ESI could not be reached at render time. */
  esi: EsiCharacterCard | null;
  /** Null when we have no row, or the database could not be reached. */
  record: CharacterRecord | null;
}
