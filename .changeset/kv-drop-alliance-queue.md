---
"@jitaspace/kv": minor
---

Removed the `allianceIds` queue. Its only producer and consumer (the EVE Kill alliance backfill) were removed in favour of the hourly `esi-update-alliances` job.
