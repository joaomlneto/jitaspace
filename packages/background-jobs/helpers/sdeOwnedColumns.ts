/**
 * Columns that live on an ESI-scraped table but are written only by an SDE
 * ingest job.
 *
 * `updateTable` compares a local row against an ESI payload by iterating the
 * *local* row's keys, so any column ESI does not supply must be stripped from
 * the local row first — otherwise the diff reports every row as modified on
 * every run, and the update writes `undefined` over the ingested value.
 *
 * The scrapers state their half as `Omit<Model, timestamps | SDE-owned>` (see
 * `EsiCorporationRow` and the `Esi*Row` types in `scrapeEsiSolarSystems` /
 * `scrapeEsiDogmaAttributes`), so a new column on one of those models is a type
 * error at the row builder until it is either supplied from ESI or listed here.
 * What the compiler cannot see is an entry left behind after its column is
 * renamed or dropped — `Omit` ignores a key the model no longer has — which is
 * what `tests/sdeOwnedColumns.test.ts` checks against the schema.
 *
 * Keep each list in sync with the columns its ingest job writes, and strip it at
 * every site that diffs the table against ESI.
 */

/** Written by `ingestSdeNpcCorporations`. */
export const SDE_OWNED_CORPORATION_COLUMNS = [
  "extent",
  "memberLimit",
  "minSecurity",
  "minimumJoinStanding",
  "initialPrice",
  "hasPlayerPersonnelManager",
  "sendCharTerminationMessage",
  "mainActivityId",
  "secondaryActivityId",
  "enemyId",
  "friendId",
] as const;

/** Written by `ingestSdePlanets` (the `attributes` sub-object of mapPlanets.yaml). */
export const SDE_OWNED_PLANET_COLUMNS = [
  "heightMap1",
  "heightMap2",
  "shaderPreset",
  "population",
] as const;

/** Written by `ingestSdeMoons` (the `attributes` sub-object of mapMoons.yaml). */
export const SDE_OWNED_MOON_COLUMNS = [
  "heightMap1",
  "heightMap2",
  "shaderPreset",
] as const;

/** Written by `ingestSdeSolarSystems`. */
export const SDE_OWNED_SOLAR_SYSTEM_COLUMNS = [
  "wormholeClassId",
  "visualEffect",
  "isRegional",
  "isInternational",
  "isHub",
  "isBorder",
  "isFringe",
  "isCorridor",
  "luminosity",
  "radius",
  "positionX",
  "positionY",
  "positionZ",
  "position2dX",
  "position2dY",
  "factionId",
] as const;

/** Written by `ingestSdeDogmaAttributes`. */
export const SDE_OWNED_DOGMA_ATTRIBUTE_COLUMNS = [
  "dataType",
  "displayWhenZero",
  "tooltipTitle",
  "tooltipDescription",
  "maxAttributeId",
  "minAttributeId",
  "chargeRechargeTimeId",
  "attributeCategoryId",
] as const;

/** Written by `ingestSdeTypes`. */
export const SDE_OWNED_TYPE_COLUMNS = [
  "basePrice",
  "metaLevel",
  "techLevel",
  "soundId",
  "shipTreeGroupId",
  "variationParentTypeId",
] as const;
