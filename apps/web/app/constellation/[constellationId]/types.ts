import type { IncursionSiteRole } from "~/app/incursions/siteRoles";
import type { IncursionState } from "~/app/incursions/types";
import type { NamedRef } from "~/lib/namedRef";

/** One of the constellation's solar systems. */
export interface ConstellationSystem {
  solarSystemId: number;
  name: string;
  securityStatus: number;
  stationCount: number;
  /** The incursion site that spawns here, if the layout is mapped. */
  siteRole: IncursionSiteRole | null;
}

/** A constellation one stargate away, and the gates that lead to it. */
export interface NeighbouringConstellation {
  constellationId: number;
  name: string;
  region: NamedRef | null;
  /** `[from, to]`: a system here, and the one it jumps to over there. */
  gates: [NamedRef, NamedRef][];
}

/** The SDE side of the page: what changes only when CCP ships a new SDE. */
export interface ConstellationPageData {
  constellationId: number;
  name: string;
  region: NamedRef | null;
  faction: NamedRef | null;
  wormholeClassId: number | null;
  systems: ConstellationSystem[];
  neighbours: NeighbouringConstellation[];
}

/** An incursion that spawned in the constellation. */
export interface ConstellationIncursion {
  incursionId: number;
  state: IncursionState;
  /** Null only for an imported incursion whose source never measured it. */
  influence: number | null;
  /** Null only for an imported incursion whose source did not record it. */
  hasBoss: boolean | null;
  stagingSolarSystemId: number | null;
  firstSeenAt: string;
  lastSeenAt: string;
  endedAt: string | null;
}

/** The constellation's incursions, most recent first. */
export interface ConstellationIncursions {
  /** When they were read; an active incursion's age counts from it. */
  readAt: string;
  incursions: ConstellationIncursion[];
}
