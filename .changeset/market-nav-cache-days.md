---
"@jitaspace/web": patch
---

Reduced the database load from the Market page's group sidebar. The sidebar's data is now cached for a day instead of an hour — it changes only when EVE ships new game data — which avoids a large, repeated database read that was driving heavy usage. The sidebar looks and behaves exactly the same, and expanding a group is still instant.
