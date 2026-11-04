import type {
  GateNeighbour,
  UniverseIncursions,
  UniverseSystem,
} from "~/components/UniversePage/types";
import type { NamedRef } from "~/lib/namedRef";

/** The SDE side of the page: what changes only when CCP ships a new SDE. */
export interface RegionPageData {
  regionId: number;
  name: string;
  /** CCP's description, in EVE's HTML. */
  description: string | null;
  faction: NamedRef | null;
  wormholeClassId: number | null;
  /** By name. */
  constellations: NamedRef[];
  /** By name, across every constellation. */
  systems: UniverseSystem[];
  /** The regions one stargate away. */
  neighbours: GateNeighbour[];
}

/** The region's incursions, most recent first. */
export type RegionIncursions = UniverseIncursions;
