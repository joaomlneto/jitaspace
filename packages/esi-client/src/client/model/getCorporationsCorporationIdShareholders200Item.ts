/**
 * Generated by orval v6.11.1 🍺
 * Do not edit manually.
 * EVE Swagger Interface
 * An OpenAPI for EVE Online
 * OpenAPI spec version: 1.17
 */
import type { GetCorporationsCorporationIdShareholders200ItemShareholderType } from './getCorporationsCorporationIdShareholders200ItemShareholderType';

/**
 * 200 ok object
 */
export type GetCorporationsCorporationIdShareholders200Item = {
  /** share_count integer */
  share_count: number;
  /** shareholder_id integer */
  shareholder_id: number;
  /** shareholder_type string */
  shareholder_type: GetCorporationsCorporationIdShareholders200ItemShareholderType;
};