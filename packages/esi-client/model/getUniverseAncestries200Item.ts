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
export type GetUniverseAncestries200Item = {
  /** The bloodline associated with this ancestry */
  bloodline_id: number;
  /** description string */
  description: string;
  /** icon_id integer */
  icon_id?: number;
  /** id integer */
  id: number;
  /** name string */
  name: string;
  /** short_description string */
  short_description?: string;
};