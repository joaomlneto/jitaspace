import type { IncursionSiteRole } from "~/app/incursions/siteRoles";
import type { IncursionState } from "~/app/incursions/types";
import type { NamedRef } from "~/lib/namedRef";

/** A solar system as the region and constellation pages list it. */
export interface UniverseSystem {
  solarSystemId: number;
  name: string;
  securityStatus: number;
  constellationId: number;
  stationCount: number;
  /** The incursion site that spawns here, if the layout is mapped. */
  siteRole: IncursionSiteRole | null;
}

/** Systems by id, for the panels that link some of them. */
export type SystemsById = ReadonlyMap<number, UniverseSystem>;

/**
 * A constellation or region one stargate away, and the gates that lead to it.
 * `region` is the neighbour's region, for a neighbouring constellation.
 */
export interface GateNeighbour {
  id: number;
  name: string;
  region: NamedRef | null;
  /** `[from, to]`: a system here, and the one it jumps to over there. */
  gates: [NamedRef, NamedRef][];
}

/** An incursion, as the region and constellation pages list them. */
export interface UniverseIncursion {
  incursionId: number;
  constellationId: number;
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

/** Incursions, most recent first. */
export interface UniverseIncursions {
  /** When they were read; an active incursion's age counts from it. */
  readAt: string;
  incursions: UniverseIncursion[];
}
