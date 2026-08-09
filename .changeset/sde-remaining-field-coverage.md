---
"@jitaspace/background-jobs": minor
"@jitaspace/db": minor
---

Capture the SDE fields that were still being read past: `npcCorporations.yaml` now
populates 11 SDE-owned `Corporation` columns plus six detail tables
(`NpcCorporationAllowedRace`, `NpcCorporationLpOfferTable`,
`NpcCorporationDivisionSlot`, `NpcCorporationInvestor`, `NpcCorporationTrade`,
`NpcCorporationExchangeRate`) via the new `ingest-sde-npc-corporations` job;
`npcCharacters.yaml` adds `Agent.isCeo`/`startDate`/`careerId`/`schoolId`/
`specialityId`; `mapSolarSystems.yaml` adds `position2dX`/`position2dY` and the
`SolarSystemDisallowedAnchorCategory`/`Group` tables; `mapPlanets.yaml` and
`mapMoons.yaml` flatten their `attributes` sub-object into
`heightMap1`/`heightMap2`/`shaderPreset` (plus `Planet.population`);
`factions.yaml` adds `FactionMemberRace`; and `types.yaml` adds
`Type.variationParentTypeId`.

The columns each SDE ingest owns are now listed in one place
(`helpers/sdeOwnedColumns.ts`) and stripped at every site that diffs the same
table against ESI, so the two scrapers cannot fight over them. Adds
`subRecord` / `optionalSdeDate` field helpers and a `npcCorporationTransforms`
module covered by unit tests.
