---
"@jitaspace/db": major
"@jitaspace/background-jobs": patch
---

Rename `DungeonAllowedShip.shipTypeId` to `typeListId` (and the compound key `dungeonId_shipTypeId` to `dungeonId_typeListId`). Every `allowedShipsList` value in dungeons.yaml is a typeLists.yaml id, the list of ships allowed into the dungeon, never a ship type id. This is breaking for code that reads the column. Apply it with `ALTER TABLE "DungeonAllowedShip" RENAME COLUMN "shipTypeId" TO "typeListId";` before deploying; `prisma db push` would drop and re-add the column instead. `ingest-sde-dungeons` writes the new column.
