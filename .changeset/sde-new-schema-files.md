---
"@jitaspace/db": minor
"@jitaspace/sde-utils": minor
"@jitaspace/background-jobs": minor
---

Track the latest EVE Online SDE schema (build 3453885, released 2026-07-31).

- **`@jitaspace/sde-utils`** — `sdeInputFiles` now registers all 79 files the SDE
  ships. The 18 that were missing (so `loadFile` threw for them) are
  `epicArcs`, `graphicMaterialSets`, `militaryCampaigns`,
  `militaryCampaignObjectives`, `missions`, `shipTreeElements`,
  `shipTreeFactions`, `shipTreeGroups`, `typeElements`, and the nine `skinr*`
  SKIN-designer files. Each is keyed by the id the rest of the SDE references it
  by — `graphicMaterialSets` by `materialSetID` (`skinMaterials.materialSetID` /
  `graphics.sofMaterialSetID`), `shipTreeGroups` by `shipTreeGroupID`
  (`types.shipTreeGroupID`), `shipTreeFactions` by `factionID`, `typeElements`
  by `typeID`. The military-campaign files are keyed by UUID rather than an
  integer, so `addId` now takes an `idAttributeType` like `noTransform` does.
  `skinrComponentPointValues` and `skinrTierThresholds` are registered as
  `noTransform`: their records are bare `rarity -> points` / `tier -> points`
  maps, where an injected id would sit alongside the numeric keys.

- **`@jitaspace/db`** — **removed** `Skin.skinDescription`. CCP dropped the field
  from `skins.yaml`, so the column had been overwritten with `null` on every
  ingest. Nothing read it.

  Added the SDE columns that were being parsed but thrown away. All are nullable
  and owned by the SDE ingest (ESI exposes no equivalent), so they stay null
  until the matching `ingest-sde-*` job runs:
  - `Type` — `basePrice`, `metaLevel`, `techLevel`, `soundId`, `shipTreeGroupId`
  - `Graphic` — `sofMaterialSetId`
  - `Group` — `anchorable`, `anchored`, `fittableNonSingleton`, `useBasePrice`
  - `MarketGroup` — `hasTypes`
  - `DogmaAttribute` — `dataType`, `displayWhenZero`, `tooltipTitle`,
    `tooltipDescription`, `maxAttributeId`, `minAttributeId`,
    `chargeRechargeTimeId` (the last three are plain ids, not self-relations:
    the ingest writes all attributes in one chunked `createMany`, so a self-FK
    could point at a row not yet inserted)
  - `DogmaEffect` — `propulsionChance`, `guid`, `distribution`, and real
    `DogmaAttribute` foreign keys for `resistanceAttributeId`,
    `npcActivationChanceAttributeId`, `fittingUsageChanceAttributeId`,
    `npcUsageChanceAttributeId`
  - `Region` — `wormholeClassId` and `nebulaGraphicId`, a `Graphic` relation
    (`mapRegions.yaml`'s `nebulaID` resolves against `graphics.yaml`, not types)
  - `Constellation` — `wormholeClassId`
  - `SolarSystem` — `wormholeClassId`, `visualEffect`, `isRegional`,
    `isInternational`
  - `Station` — `reprocessingHangarFlag`
  - `Race` — `shipTypeId`, a `Type` relation for the race's starter ship
  - `Faction` — `flatLogo`, `flatLogoWithName`

  Requires a schema push.

- **`@jitaspace/background-jobs`** — `ingestSdeSkins` no longer reads the removed
  `skinDescription`, and the twelve `ingest-sde-*` jobs above now populate the
  new columns. Optional foreign keys are guarded against their target file the
  way `ingestSdeTypes` already guards `graphicID`.

  The ESI scrapers that share these tables (`scrape-esi-types`, `-groups`,
  `-market-groups`, `-graphics`, `-dogma-attributes`, `-dogma-effects`,
  `-regions`, `-constellations`, `-solar-systems`, `-stations`, `-races`,
  `-factions`, plus `scrape-sde-races`) now exclude the new columns from their
  local-vs-remote diff. Without that they would see every row as modified on
  every run, exactly like the `MarketGroup.iconId` fix.
