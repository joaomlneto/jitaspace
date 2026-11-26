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
 * `EsiCorporationRow` and `EsiDogmaAttributeRow` in `scrapeEsiDogmaAttributes`),
 * so a new column on one of those models is a type error at the row builder
 * until it is either supplied from ESI or listed here. What the compiler cannot
 * see is an entry left behind after its column is renamed or dropped — `Omit`
 * ignores a key the model no longer has — which is what
 * `tests/sdeOwnedColumns.test.ts` checks against the schema.
 *
 * Keep each list in sync with the columns its ingest job writes, and strip it at
 * every site that diffs the table against ESI.
 *
 * Only tables ESI still writes need a list. The static universe tables (types,
 * groups, the map, stations, factions, races, …) had one each until ESI
 * stopped serving them at compatibility date 2026-11-19; the SDE ingest jobs
 * are now their only writer.
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
  "size",
  "sizeFactor",
  "isUnique",
  "isDeletedByCcp",
  "solarSystemId",
  "raceId",
  "iconId",
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

/** Written by `scrapeSdeAgents` from npcCharacters.yaml — ESI does not supply these. */
export const SDE_OWNED_CHARACTER_COLUMNS = ["ancestryId", "isUnique"] as const;
