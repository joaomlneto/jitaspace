/**
 * Generated by orval v6.11.1 🍺
 * Do not edit manually.
 * EVE Swagger Interface
 * An OpenAPI for EVE Online
 * OpenAPI spec version: 1.17
 */
import type { GetCharactersCharacterIdFwStats200Kills } from './getCharactersCharacterIdFwStats200Kills';
import type { GetCharactersCharacterIdFwStats200VictoryPoints } from './getCharactersCharacterIdFwStats200VictoryPoints';

/**
 * 200 ok object
 */
export type GetCharactersCharacterIdFwStats200 = {
  /** The given character's current faction rank */
  current_rank?: number;
  /** The enlistment date of the given character into faction warfare. Will not be included if character is not enlisted in faction warfare */
  enlisted_on?: string;
  /** The faction the given character is enlisted to fight for. Will not be included if character is not enlisted in faction warfare */
  faction_id?: number;
  /** The given character's highest faction rank achieved */
  highest_rank?: number;
  /** Summary of kills done by the given character against enemy factions */
  kills: GetCharactersCharacterIdFwStats200Kills;
  /** Summary of victory points gained by the given character for the enlisted faction */
  victory_points: GetCharactersCharacterIdFwStats200VictoryPoints;
};