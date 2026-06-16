import type { SdeRecord } from "@jitaspace/sde-utils";

import { enString, requiredNumber } from "./sdeFields";

/**
 * Celestial naming, per the EVE static-data guide
 * (https://developers.eveonline.com/docs/guides/staticdata/#celestial-names).
 * Celestials carry no `name` field; the display name is built from the universe
 * hierarchy:
 *
 * - Star          → `<solarSystemName>`
 * - Planet        → `<solarSystemName> <celestialIndex-as-Roman>`        e.g. "Jita IV"
 * - Moon          → `<planetName> - Moon <orbitIndex>`                   e.g. "Jita IV - Moon 4"
 * - Asteroid Belt → `<planetName> - Asteroid Belt <orbitIndex>`
 * - Stargate      → `Stargate (<destination solarSystemName>)`
 *
 * A moon's / belt's parent planet is its `orbitID` (the body it orbits), which
 * is also the value stored in `Moon.planetId` / `AsteroidBelt.planetId`.
 */

const ROMAN: readonly [number, string][] = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

/** Convert a positive integer to Roman numerals (e.g. 4 → "IV"). */
export function toRoman(value: number): string {
  let remaining = Math.trunc(value);
  let result = "";
  for (const [amount, symbol] of ROMAN) {
    while (remaining >= amount) {
      result += symbol;
      remaining -= amount;
    }
  }
  return result;
}

/** Map of `solarSystemID` → English system name, from `mapSolarSystems.yaml`. */
export function solarSystemNames(systems: SdeRecord): Map<number, string> {
  const names = new Map<number, string>();
  for (const [id, record] of Object.entries(systems)) {
    names.set(
      Number(id),
      enString((record as Record<string, unknown>).name) ?? "",
    );
  }
  return names;
}

/**
 * Map of `planetID` → display name, from `mapPlanets.yaml` plus the system names
 * from {@link solarSystemNames}. A named planet uses its full `uniqueName` (e.g.
 * "Amarr VIII (Oris)", "New Caldari Prime"); otherwise it is
 * "<systemName> <Roman(celestialIndex)>".
 */
export function planetNames(
  planets: SdeRecord,
  systemNames: Map<number, string>,
): Map<number, string> {
  const names = new Map<number, string>();
  for (const [id, value] of Object.entries(planets)) {
    const record = value as Record<string, unknown>;
    const system = systemNames.get(requiredNumber(record.solarSystemID)) ?? "";
    names.set(
      Number(id),
      enString(record.uniqueName) ??
        `${system} ${toRoman(requiredNumber(record.celestialIndex))}`,
    );
  }
  return names;
}

/**
 * Map of `moonID` → display name, from `mapMoons.yaml` plus the planet names
 * from {@link planetNames}. A named moon uses its full `uniqueName`; otherwise it
 * is "<planetName> - Moon <orbitIndex>". A moon's parent planet is its `orbitID`.
 * Used to resolve a station's `orbitName` when it orbits a moon.
 */
export function moonNames(
  moons: SdeRecord,
  planetNameById: Map<number, string>,
): Map<number, string> {
  const names = new Map<number, string>();
  for (const [id, value] of Object.entries(moons)) {
    const record = value as Record<string, unknown>;
    const planet = planetNameById.get(requiredNumber(record.orbitID)) ?? "";
    names.set(
      Number(id),
      enString(record.uniqueName) ??
        `${planet} - Moon ${requiredNumber(record.orbitIndex)}`,
    );
  }
  return names;
}
