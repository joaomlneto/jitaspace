---
"@jitaspace/db": patch
---

Documentation only, no schema change: `MercenaryTacticalOperation.dungeonId` always equals the operation id, because the SDE dropped its separate `dungeonID` field after build 3693310. `PlanetResource` now notes that planets carry both `power` and `workforce`, with 0 for the one they don't provide, so "provides power" means `power > 0`.
