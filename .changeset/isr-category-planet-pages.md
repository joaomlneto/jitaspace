---
"@jitaspace/web": patch
---

Category and planet pages now load faster, served from the cache instead of being rebuilt on every visit. A planet that does not exist now shows the not-found page instead of an empty one, and a temporary database outage no longer leaves a category page showing "not found".
