---
"@jitaspace/hooks": minor
---

Added Planetary Interaction hooks: `useCharacterPlanets`, `useCharacterPlanetLayout`, `useCharacterPlanetLayouts` (many colonies across characters), `useCorporationCustomsOffices` (all pages), `usePlanetSchematic` and `usePlanetSchematics`. Every multi-subject hook (`useMultipleCharacterPlanets`, `useMultipleCorporationCustomsOffices`, and the rest built with `defineMultiEsiQuery` / `defineMultiEsiValueQuery`) now takes an optional `{ subjectIds }` to query a chosen list of characters, corporations or alliances instead of all of them.
