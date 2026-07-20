---
"@jitaspace/db": patch
---

Made `Station.maxDockableShipVolume` and `Station.officeRentalCost` nullable. These are not present in the EVE Online SDE (they are ESI-only), so SDE-based station ingestion leaves them unset and the ESI scraper fills them. Requires a database migration.
