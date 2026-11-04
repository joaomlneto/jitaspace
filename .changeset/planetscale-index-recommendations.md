---
"@jitaspace/db": patch
---

Drop 17 indexes that duplicated the leading columns of their table's primary key, and replace `Corporation(enlistedFactionId)` with `Corporation(enlistedFactionId, factionId, memberCount)` for the faction warfare corporation lists. Already applied to production.
