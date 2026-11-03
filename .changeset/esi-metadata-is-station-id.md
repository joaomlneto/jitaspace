---
"@jitaspace/esi-metadata": minor
---

Add `isStationId(id)`, which tells whether an ID falls in the station ID range (`stationRanges`), so callers stop rebuilding the check from `isIdInRanges`.
