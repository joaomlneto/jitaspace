/**
 * Generated by orval v6.11.1 🍺
 * Do not edit manually.
 * EVE Swagger Interface
 * An OpenAPI for EVE Online
 * OpenAPI spec version: 1.17
 */

/**
 * Summary of kills done by the given character against enemy factions
 */
export type GetCharactersCharacterIdFwStats200Kills = {
  /** Last week's total number of kills by a given character against enemy factions */
  last_week: number;
  /** Total number of kills by a given character against enemy factions since the character enlisted */
  total: number;
  /** Yesterday's total number of kills by a given character against enemy factions */
  yesterday: number;
};