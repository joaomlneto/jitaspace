---
"@jitaspace/background-jobs": patch
---

Schedule the LP store offer scrape daily (`esi-refresh-loyalty-store-offers`, 12:00 UTC); only `bootstrap-database` ran it before. A withdrawn offer is now marked deleted only in the store that dropped it: matching on the offer id alone marked it deleted in every store sharing that id.
