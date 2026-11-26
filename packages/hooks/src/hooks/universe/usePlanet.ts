"use client";

import type { Localized, SdeHookOptions, SdePlanet } from "../../sde";
import type { NamedCelestial } from "./celestial";
import { planetName } from "../../sde";
import { useNamedCelestial } from "./celestial";

export type Planet = NamedCelestial<"mapPlanets">;

const systemIdOf = (planet: Localized<SdePlanet>) => planet.solarSystemID;
const nameOf = (planet: Localized<SdePlanet>, systemName: string) =>
  planetName(systemName, planet.celestialIndex);

/** A planet from the SDE, with the name EVE shows for it ("Jita IV"). */
export const usePlanet = (
  planetId: number | undefined,
  options?: SdeHookOptions,
) => useNamedCelestial("mapPlanets", planetId, options, systemIdOf, nameOf);
