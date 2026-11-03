---
"@jitaspace/background-jobs": minor
---

Added the `esi-track-sovereignty` job. Every 5 minutes it polls ESI's `GET /sovereignty/systems`, updates `SolarSystemSovereignty` (moved here from the hourly `esi-update-alliances`, which no longer touches sovereignty), and records each change of holder in `SolarSystemSovereigntyPeriod`. Gaps between polls (deploys, outages) are filled from EVE Ref's hourly archive before the new snapshot is recorded. Added `backfill-everef-sovereignty-history`, which imports EVE Ref's sovereignty archive from 2017 on, resumes from where the history ends, and chains itself until it catches up. Requests to data.everef.net now send a `JitaSpace` User-Agent.
