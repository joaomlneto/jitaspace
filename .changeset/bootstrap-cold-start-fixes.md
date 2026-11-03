---
"@jitaspace/background-jobs": patch
---

`bootstrap-database` completes on an empty database again. `scrape-esi-dogma-effects` and `scrape-esi-ancestries` no longer write an icon id before the SDE ingest has created that icon, which used to fail on the foreign key. `scrape-esi-stargates` links gates to their destinations in a single statement, so PostgreSQL no longer deadlocks on mutually-referencing gate pairs.
