"use client";

import type { Localized, SdeAsteroidBelt, SdeHookOptions } from "../../sde";
import type { NamedCelestial } from "./celestial";
import { asteroidBeltName } from "../../sde";
import { useNamedCelestial } from "./celestial";

export type AsteroidBelt = NamedCelestial<"mapAsteroidBelts">;

const systemIdOf = (belt: Localized<SdeAsteroidBelt>) => belt.solarSystemID;
const nameOf = (belt: Localized<SdeAsteroidBelt>, systemName: string) =>
  asteroidBeltName(systemName, belt.celestialIndex, belt.orbitIndex);

/**
 * An asteroid belt from the SDE, with the name EVE shows for it
 * ("Tanoo I - Asteroid Belt 1").
 */
export const useAsteroidBelt = (
  asteroidBeltId: number | undefined,
  options?: SdeHookOptions,
) =>
  useNamedCelestial(
    "mapAsteroidBelts",
    asteroidBeltId,
    options,
    systemIdOf,
    nameOf,
  );
