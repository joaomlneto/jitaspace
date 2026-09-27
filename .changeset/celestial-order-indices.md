---
"@jitaspace/db": minor
---

Stored the order of planets, moons and asteroid belts: `Planet.celestialIndex`, `Moon.celestialIndex` / `orbitIndex` and `AsteroidBelt.orbitIndex`. The SDE ingest only used these to build names, so an object's order survived only inside its name — and a named moon such as "Kor-Azor Prime IV (Eclipticum) - Moon Griklaeum" has no number to read. Sort a system's moons by `(celestialIndex, orbitIndex)`. All four are nullable and fill in on the next SDE ingest. Requires a database migration.
