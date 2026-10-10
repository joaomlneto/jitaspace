import type { IncursionState } from "./math";
import type { NpcStats } from "~/lib/npcStats";

export type { IncursionState } from "./math";

/** Where a row came from: our own tracking, or an imported history. */
export type IncursionSource = "esi" | "eve_incursions_de" | "everef";

export interface IncursionRow {
  incursionId: number;
  constellationId: number;
  factionId: number;
  type: string;
  source: IncursionSource;
  /** Null only for an imported incursion whose source did not record it. */
  stagingSolarSystemId: number | null;
  stagingSovereigntyAllianceId: number | null;
  stagingSovereigntyFactionId: number | null;
  state: IncursionState;
  /** Null only for an imported incursion whose source never measured it. */
  influence: number | null;
  /** Null only for an imported incursion whose source did not record it. */
  hasBoss: boolean | null;
  infestedSolarSystemIds: number[];
  firstSeenAt: string;
  lastSeenAt: string;
  endedAt: string | null;
  isObservedFromStart: boolean;
  establishedAt: string | null;
  mobilizingAt: string | null;
  withdrawingAt: string | null;
}

/** An incursion our own tracking recorded: every field ESI reports is set. */
export type TrackedIncursionRow = IncursionRow & {
  stagingSolarSystemId: number;
  influence: number;
  hasBoss: boolean;
};

export const isTrackedIncursion = (
  row: IncursionRow,
): row is TrackedIncursionRow =>
  row.stagingSolarSystemId !== null &&
  row.influence !== null &&
  row.hasBoss !== null;

export interface IncursionStation {
  stationId: number;
  name: string;
  hasRepair: boolean;
}

export interface IncursionSolarSystem {
  name: string;
  securityStatus: number;
  /** Only for the systems of active incursions. */
  longestWarpAu?: number;
  /** Only for the systems of active incursions. */
  stations?: IncursionStation[];
}

/** Who holds a system: an alliance, or a faction. */
export interface SovereigntyHolder {
  allianceId: number | null;
  factionId: number | null;
}

/** The names of what incursions refer to, keyed by id. */
export interface IncursionLookups {
  constellations: Record<number, { name: string; regionId: number }>;
  regions: Record<number, string>;
  factions: Record<number, string>;
  alliances: Record<number, string>;
  solarSystems: Record<number, IncursionSolarSystem>;
}

export interface IncursionsData extends IncursionLookups {
  /** When the page's data was read; "ago" times count from it. */
  readAt: string;
  /** Active incursions, then those that ended in the last 30 days. */
  incursions: IncursionRow[];
  /** Each active incursion's influence readings, oldest first: `[at, influence]`. */
  influence: Record<number, [number, number][]>;
  /** Today's holder of each active incursion's staging system. */
  currentSovereignty: Record<number, SovereigntyHolder>;
}

/** An appearance, state change or end: `[eventId, incursionId, observedAt, kind, state]`. */
export type IncursionStateEventTuple = [
  number,
  number,
  string,
  "appeared" | "state_changed" | "ended",
  IncursionState | null,
];

/** The History tab's data, from `/api/incursions/history`. */
export interface IncursionHistory extends IncursionLookups {
  readAt: string;
  /** Every ended incursion, most recently ended first, then active ones. */
  incursions: IncursionRow[];
  /** Every appearance, state change and end, most recent first. */
  stateEvents: IncursionStateEventTuple[];
}

export interface IncursionRat {
  typeId: number;
  name: string;
  stats: NpcStats;
}

export interface IncursionRatGroup {
  groupId: number;
  name: string;
  rats: IncursionRat[];
}
