/**
 * Generated by orval v6.11.1 🍺
 * Do not edit manually.
 * EVE Swagger Interface
 * An OpenAPI for EVE Online
 * OpenAPI spec version: 1.17
 */
import type { GetLoyaltyStoresCorporationIdOffers200ItemRequiredItemsItem } from './getLoyaltyStoresCorporationIdOffers200ItemRequiredItemsItem';

/**
 * 200 ok object
 */
export type GetLoyaltyStoresCorporationIdOffers200Item = {
  /** Analysis kredit cost */
  ak_cost?: number;
  /** isk_cost integer */
  isk_cost: number;
  /** lp_cost integer */
  lp_cost: number;
  /** offer_id integer */
  offer_id: number;
  /** quantity integer */
  quantity: number;
  /** required_items array */
  required_items: GetLoyaltyStoresCorporationIdOffers200ItemRequiredItemsItem[];
  /** type_id integer */
  type_id: number;
};