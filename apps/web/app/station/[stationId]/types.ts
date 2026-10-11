import type { Agent } from "~/components/Agents";
import type { NamedRef } from "~/lib/namedRef";

/**
 * What the station page reads on the server, all of it SDE data: the station,
 * where it is, who runs it, the services its operation offers and the agents
 * stationed there. Crosses to the client as plain, serializable props.
 */

export type { NamedRef } from "~/lib/namedRef";

export interface StationLocation {
  solarSystem: NamedRef;
  securityStatus: number;
  constellation: NamedRef;
  region: NamedRef | null;
}

/** The celestial a station orbits: a moon, a planet or (once) a star. */
export interface StationOrbit {
  kind: "moon" | "planet" | "star";
  id: number;
  name: string;
  /** The planet a moon circles, which has a page of its own. */
  planet: NamedRef | null;
}

export interface StationService {
  serviceId: number;
  name: string;
  description: string | null;
  /**
   * The standing with the owner's faction this service demands, when that
   * faction restricts it (stationStandingsRestrictions.yaml).
   */
  minimumStanding: number | null;
}

export interface StationOperation {
  id: number;
  name: string;
  description: string | null;
  activity: NamedRef | null;
  manufacturingFactor: number;
  researchFactor: number;
}

export interface StationSchool {
  schoolId: number;
  name: string;
  race: NamedRef | null;
}

export interface StationAgents {
  agents: Agent[];
  agentTypes: { agentTypeId: number; name: string }[];
  agentDivisions: { npcCorporationDivisionId: number; name: string }[];
}

export interface StationPageData extends StationAgents {
  stationId: number;
  name: string;
  type: NamedRef;
  race: NamedRef | null;
  owner: NamedRef | null;
  /** The owner corporation's faction. */
  faction: NamedRef | null;
  location: StationLocation | null;
  orbit: StationOrbit | null;
  operation: StationOperation | null;
  services: StationService[];
  reprocessingEfficiency: number;
  reprocessingStationsTake: number;
  /** ESI-only: null until the ESI station scraper has filled them in. */
  maxDockableShipVolume: number | null;
  officeRentalCost: number | null;
  /** Schools whose new capsuleers start here. */
  schools: StationSchool[];
  /** NPC corporations headquartered here. */
  headquarters: NamedRef[];
}
