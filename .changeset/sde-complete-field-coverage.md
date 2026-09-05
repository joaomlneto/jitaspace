---
"@jitaspace/db": minor
---

Stored the remaining SDE fields that had no column. Roughly 105 nullable columns across 21 existing models plus five new ones — `GraphicSofLayout`, `RaceSkill`, `NpcCharacterSkill`, `FreelanceJobSchemaParameter` and `FreelanceJobSchemaParameterValueType` (with the `FreelanceJobParameterKind` enum).

Highlights: celestial geometry (`positionX/Y/Z`, `radius`) and the full `statistics` block on `Moon`, `Planet` and `AsteroidBelt`, so the universe is now spatially describable; `positionX/Y/Z` on `Stargate`, `Station`, `Region` and `Constellation`; `Type.raceId` / `metaGroupId` / `isRepackable` / `factionId`; `Ancestry`'s five character-creation attributes; `iconId` on `Category`, `Group`, `Faction`, `Bloodline` and `Race`; seven npcCorporations columns on `Corporation`; and `Character.ancestryId`.

Eleven `SDE_OWNED_*_COLUMNS` lists in `@jitaspace/background-jobs` now cover every table an ESI scraper shares with an SDE ingest, and the six scrapers that previously stripped columns with an inline array use the shared constants instead. Without that, each ESI run would have reported every row modified and written `undefined` over the ingested values.

`Type.factionId` is FK-guarded: 59 of the 1,376 `factionID` values name a faction `factions.yaml` does not contain, and those land null. Requires a database migration.
