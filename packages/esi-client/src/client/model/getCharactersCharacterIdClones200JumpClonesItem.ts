/**
 * Generated by orval v6.11.1 🍺
 * Do not edit manually.
 * EVE Swagger Interface
 * An OpenAPI for EVE Online
 * OpenAPI spec version: 1.17
 */
import type { GetCharactersCharacterIdClones200JumpClonesItemLocationType } from './getCharactersCharacterIdClones200JumpClonesItemLocationType';

/**
 * jump_clone object
 */
export type GetCharactersCharacterIdClones200JumpClonesItem = {
  /** implants array */
  implants: number[];
  /** jump_clone_id integer */
  jump_clone_id: number;
  /** location_id integer */
  location_id: number;
  /** location_type string */
  location_type: GetCharactersCharacterIdClones200JumpClonesItemLocationType;
  /** name string */
  name?: string;
};