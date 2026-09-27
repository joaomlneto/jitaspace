---
"@jitaspace/background-jobs": patch
---

`ingest-sde-moons` and `ingest-sde-asteroid-belts` now name rows through the shared `moonNames` / new `asteroidBeltNames` helpers, so a celestial's `uniqueName` wins over the rebuilt "<planet> - Moon|Asteroid Belt <orbitIndex>" pattern. They had built the pattern inline and got 3 of 137 named moons and 16 of 46 named belts wrong — rows the ESI solar-system scraper, writing the same column with the right value, then kept overwriting. `ingest-sde-types` also writes the new `Type.isDynamicType`, which is SDE-owned and stripped from the ESI diff; `scrapeEsiTypes` now types its rows as `EsiTypeRow`, so a future Type column left out of `SDE_OWNED_TYPE_COLUMNS` fails to compile instead of making every row diff as modified.
