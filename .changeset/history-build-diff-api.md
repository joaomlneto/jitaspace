---
"@jitaspace/web": patch
---

Added a public JSON API for EVE build changes: `GET /api/history/diff/{build}` gives a build's date and server and lists the builds it can be compared with, with how many entries each comparison added, changed and removed; `GET /api/history/diff/{from}/{to}` lists every item, SKIN and other static-data entry that changed between two consecutive builds.
