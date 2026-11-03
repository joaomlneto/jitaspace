import type { ESIScope } from "@jitaspace/esi-metadata";

/** Reads a character's colonies and their layouts (despite its name). */
export const PLANETS_SCOPE: ESIScope = "esi-planets.manage_planets.v1";

/** Reads a corporation's customs offices. */
export const CUSTOMS_OFFICES_SCOPE: ESIScope =
  "esi-planets.read_customs_offices.v1";
