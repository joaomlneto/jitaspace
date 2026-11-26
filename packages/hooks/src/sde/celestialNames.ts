/**
 * EVE's names for celestials, which the SDE leaves out unless a celestial has
 * a unique one: a planet is its system plus its celestial index in Roman
 * numerals ("Jita IV"), and what orbits it adds its own kind and orbit index
 * ("Jita IV - Moon 4", "Tanoo I - Asteroid Belt 1"). These are the strings ESI
 * returned for the same ids.
 */

const ROMAN_NUMERALS: readonly [number, string][] = [
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

export function toRomanNumeral(value: number): string {
  let remaining = Math.trunc(value);
  let numeral = "";
  for (const [amount, symbol] of ROMAN_NUMERALS) {
    while (remaining >= amount) {
      numeral += symbol;
      remaining -= amount;
    }
  }
  return numeral;
}

export const planetName = (systemName: string, celestialIndex: number) =>
  `${systemName} ${toRomanNumeral(celestialIndex)}`;

export const moonName = (
  systemName: string,
  celestialIndex: number,
  orbitIndex: number,
) => `${planetName(systemName, celestialIndex)} - Moon ${orbitIndex}`;

export const asteroidBeltName = (
  systemName: string,
  celestialIndex: number,
  orbitIndex: number,
) => `${planetName(systemName, celestialIndex)} - Asteroid Belt ${orbitIndex}`;

export const starName = (systemName: string) => `${systemName} - Star`;

export const stargateName = (destinationSystemName: string) =>
  `Stargate (${destinationSystemName})`;
