---
"@jitaspace/db": minor
---

Add the SDE-only columns the solar system and type pages render, all nullable:
`SolarSystem` gains `luminosity`, `radius`, `positionX`/`positionY`/`positionZ`,
the `isHub`/`isBorder`/`isFringe`/`isCorridor` flags and a `factionId` relation
for the faction holding the system (distinct from `Faction.solarSystemId`, which
is a faction's home system); `DogmaAttribute` gains an `attributeCategoryId`
relation. Both are owned by their `ingestSde*` job.
