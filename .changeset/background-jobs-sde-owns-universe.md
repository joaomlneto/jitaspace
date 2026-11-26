---
"@jitaspace/background-jobs": minor
---

The static universe tables are now written only by the SDE ingest jobs. ESI stops serving its static `/universe` routes at compatibility date 2026-11-19, so the 15 scrapers that read them are gone (`scrape-esi-{types,groups,categories,graphics,regions,constellations,solar-systems,planets,moons,stargates,stations,factions,races,bloodlines,ancestries}`), along with the `SDE_OWNED_*_COLUMNS` lists that kept them apart from the ingests.

The ingests take over the columns only ESI used to write:

- `Type.packagedVolume`, from types.yaml.
- `Bloodline.shipTypeId`, from the race's `shipTypeID`.
- `Faction.corporationId`, `militiaCorporationId` and `solarSystemId`, from factions.yaml.
- `Station.ownerId` (from npcStations.yaml) and `Station.raceId` (the station type's race).
- The `TypeAttribute` rows for mass, capacity, volume and radius, built from the type's own fields as ESI did.

A few values have no source left and keep ESI's last value, while new rows leave them null: `Race.factionId`, `Graphic.collisionFile`/`sofDna`, `Station.maxDockableShipVolume`/`officeRentalCost`, and the `charge`/`shieldCharge` type attributes. Type mass, capacity, volume and radius are now stored as the SDE has them, so a missing value is null instead of ESI's 0 (or 1 for radius).

`createCorpAndItsRefRecords` now builds a missing bloodline, race, faction or NPC station from the SDE over HTTP (`sde.evetech.net`). `bootstrap-database` runs the NPC-corporation scrape inside the SDE loop, just before the races.
