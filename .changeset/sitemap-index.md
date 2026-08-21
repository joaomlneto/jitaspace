---
"@jitaspace/web": patch
---

Added a sitemap index at `/sitemap.xml`. Search engines look for that address first, and it used to return "not found" — the actual sitemap pages were only reachable if a crawler read robots.txt. The index now lists them all, and robots.txt points at it, so it stays correct as pages are added across deploys.
