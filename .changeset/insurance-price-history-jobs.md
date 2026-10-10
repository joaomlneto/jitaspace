---
"@jitaspace/background-jobs": minor
---

Added the `esi-track-insurance-prices` job. Every hour (ESI caches the list for an hour) it records ESI's insurance price list as of its Last-Modified, closing the rows of prices that changed and opening new ones. After a gap of over 90 minutes since the last observation it sends `backfill-everef-insurance-prices`, which imports EVE Ref's hourly archive (from December 2022) for any range, also used to bootstrap the history. An observation can be recorded out of order: one landing in a gap splits or moves the rows around it.
