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

/**
 * What the system holds, from our database: the celestials, gates and stations
 * the page lists. ESI used to return this in one response; the SDE spreads it
 * over a record per celestial, so the server reads it here instead of the
 * browser fetching dozens of records.
 */
export interface SolarSystemContents {
  securityStatus: number;
  securityClass: string | null;
  starId: number | null;
  star: { spectralClass: string; temperature: number } | null;
  /** In orbit order, each with how many moons and asteroid belts it has. */
  planets: { planetId: number; moonCount: number; beltCount: number }[];
  /** Each with the system it leads to, when we know it. */
  stargates: { stargateId: number; destinationSystemId: number | null }[];
  stationIds: number[];
}
