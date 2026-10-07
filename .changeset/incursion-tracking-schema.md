---
"@jitaspace/db": minor
---

Added `Incursion`, `IncursionSolarSystem` and `IncursionEvent` (with the `IncursionState`, `IncursionEventKind` and `IncursionSource` enums; sources `esi`, `eve_incursions_de` and `everef`) to record incursions from ESI's `GET /incursions`: one row per incursion, kept after it ends, plus one event per change between polls. `Incursion` keeps who held its staging system's sovereignty when it appeared (`stagingSovereigntyAllianceId`, `stagingSovereigntyFactionId`), and where the row came from (`source`, `sourceId`): imported history leaves `stagingSolarSystemId`, `influence` and `hasBoss` null where its source never recorded them.
