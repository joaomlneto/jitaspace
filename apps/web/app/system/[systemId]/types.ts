/**
 * The SDE-sourced half of a solar system, resolved on the server from our own
 * database and handed to the client page as a plain, serializable prop.
 *
 * ESI covers the dynamic side of a system (jumps, kills, sovereignty); these are
 * the static columns only the SDE knows, owned by `ingestSdeSolarSystems`.
 */
export interface SolarSystemSdeInfo {
  luminosity: number | null;
  radius: number | null;
  wormholeClassId: number | null;
  position: { x: number; y: number; z: number } | null;
  factionId: number | null;
  isHub: boolean;
  isBorder: boolean;
  isFringe: boolean;
  isCorridor: boolean;
  isInternational: boolean;
  isRegional: boolean;
}
