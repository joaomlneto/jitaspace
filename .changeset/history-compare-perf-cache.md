---
"@jitaspace/web": patch
---

Comparing two builds that are far apart no longer times out — the Compare Builds page now computes the difference in the database and caches each build-pair result. Comparisons also have a shareable `/history/compare/<from>/<to>` URL.
