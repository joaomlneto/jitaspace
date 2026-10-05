import type { RaceTableName } from "./types";

/** The five character attributes, in the order the game lists them. */
export const CHARACTER_ATTRIBUTES = [
  "intelligence",
  "perception",
  "charisma",
  "willpower",
  "memory",
] as const;

/** The tables `/api/race/[raceId]/[table]` serves. */
export const RACE_TABLE_NAMES = [
  "items",
  "corporations",
  "stations",
] as const satisfies readonly RaceTableName[];

export function isRaceTableName(value: string): value is RaceTableName {
  return (RACE_TABLE_NAMES as readonly string[]).includes(value);
}
