/**
 * Generated by orval v6.11.1 🍺
 * Do not edit manually.
 * EVE Swagger Interface
 * An OpenAPI for EVE Online
 * OpenAPI spec version: 1.17
 */
import type { GetCharactersCharacterIdSkills200SkillsItem } from './getCharactersCharacterIdSkills200SkillsItem';

/**
 * 200 ok object
 */
export type GetCharactersCharacterIdSkills200 = {
  /** skills array */
  skills: GetCharactersCharacterIdSkills200SkillsItem[];
  /** total_sp integer */
  total_sp: number;
  /** Skill points available to be assigned */
  unallocated_sp?: number;
};