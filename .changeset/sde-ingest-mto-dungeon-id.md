---
"@jitaspace/background-jobs": patch
"@jitaspace/web": patch
---

Game data is updating again after stalling on 13 November 2026. Changes CCP has shipped since then, such as new items, dungeons and NPC agents, now reach the site.

For developers: SDE build 3698585 removed `dungeonID` from `mercenaryTacticalOperations.yaml` because it repeated the record key. `ingest-sde-mercenary-tactical-operations` still read the field as a required number, got `NaN`, and Prisma rejected the row. `ingest-sde-all` runs its steps in sequence, so every step after that one was skipped and the build was never recorded as ingested. The dungeon id now comes from the record key, which holds the same value on builds from before and after the change.
