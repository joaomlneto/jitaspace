/**
 * Columns that live on an ESI-scraped table but are written only by an SDE
 * ingest job.
 *
 * `updateTable` compares a local row against an ESI payload by iterating the
 * *local* row's keys, so any column ESI does not supply must be stripped from
 * the local row first — otherwise the diff reports every row as modified on
 * every run, and the update writes `undefined` over the ingested value.
 *
 * Nothing type-checks this: adding an SDE-owned column without listing it here
 * fails silently at runtime. Keep each list in sync with the columns its ingest
 * job writes, and strip it at every site that diffs the table against ESI.
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
  "position2dX",
  "position2dY",
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
