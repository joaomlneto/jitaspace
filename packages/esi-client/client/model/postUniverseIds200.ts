/**
 * Generated by orval v6.11.1 🍺
 * Do not edit manually.
 * EVE Swagger Interface
 * An OpenAPI for EVE Online
 * OpenAPI spec version: 1.17
 */
import type { PostUniverseIds200AgentsItem } from './postUniverseIds200AgentsItem';
import type { PostUniverseIds200AlliancesItem } from './postUniverseIds200AlliancesItem';
import type { PostUniverseIds200CharactersItem } from './postUniverseIds200CharactersItem';
import type { PostUniverseIds200ConstellationsItem } from './postUniverseIds200ConstellationsItem';
import type { PostUniverseIds200CorporationsItem } from './postUniverseIds200CorporationsItem';
import type { PostUniverseIds200FactionsItem } from './postUniverseIds200FactionsItem';
import type { PostUniverseIds200InventoryTypesItem } from './postUniverseIds200InventoryTypesItem';
import type { PostUniverseIds200RegionsItem } from './postUniverseIds200RegionsItem';
import type { PostUniverseIds200StationsItem } from './postUniverseIds200StationsItem';
import type { PostUniverseIds200SystemsItem } from './postUniverseIds200SystemsItem';

/**
 * 200 ok object
 */
export type PostUniverseIds200 = {
  /** agents array */
  agents?: PostUniverseIds200AgentsItem[];
  /** alliances array */
  alliances?: PostUniverseIds200AlliancesItem[];
  /** characters array */
  characters?: PostUniverseIds200CharactersItem[];
  /** constellations array */
  constellations?: PostUniverseIds200ConstellationsItem[];
  /** corporations array */
  corporations?: PostUniverseIds200CorporationsItem[];
  /** factions array */
  factions?: PostUniverseIds200FactionsItem[];
  /** inventory_types array */
  inventory_types?: PostUniverseIds200InventoryTypesItem[];
  /** regions array */
  regions?: PostUniverseIds200RegionsItem[];
  /** stations array */
  stations?: PostUniverseIds200StationsItem[];
  /** systems array */
  systems?: PostUniverseIds200SystemsItem[];
};