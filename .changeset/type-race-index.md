---
"@jitaspace/db": patch
---

Index `Type.raceId`, so listing a race's types reads its rows instead of scanning the whole `Type` table.
