import type {
  GateNeighbour,
  UniverseIncursions,
  UniverseSystem,
} from "~/components/UniversePage/types";
import type { NamedRef } from "~/lib/namedRef";

/** The SDE side of the page: what changes only when CCP ships a new SDE. */
export interface ConstellationPageData {
  constellationId: number;
  name: string;
  region: NamedRef | null;
  faction: NamedRef | null;
  wormholeClassId: number | null;
  systems: UniverseSystem[];
  /** The constellations one stargate away. */
  neighbours: GateNeighbour[];
}

/** The constellation's incursions, most recent first. */
export type ConstellationIncursions = UniverseIncursions;
