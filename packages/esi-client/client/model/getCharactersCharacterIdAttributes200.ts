/**
 * Generated by orval v6.11.1 🍺
 * Do not edit manually.
 * EVE Swagger Interface
 * An OpenAPI for EVE Online
 * OpenAPI spec version: 1.17
 */

/**
 * 200 ok object
 */
export type GetCharactersCharacterIdAttributes200 = {
  /** Neural remapping cooldown after a character uses remap accrued over time */
  accrued_remap_cooldown_date?: string;
  /** Number of available bonus character neural remaps */
  bonus_remaps?: number;
  /** charisma integer */
  charisma: number;
  /** intelligence integer */
  intelligence: number;
  /** Datetime of last neural remap, including usage of bonus remaps */
  last_remap_date?: string;
  /** memory integer */
  memory: number;
  /** perception integer */
  perception: number;
  /** willpower integer */
  willpower: number;
};