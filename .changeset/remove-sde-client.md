---
"@jitaspace/web": patch
---

Market group, type, system, character and history pages now read their EVE static data from JitaSpace's own database instead of a separate SDE service. Pages that previously fired several static-data requests from the browser (a ship's attribute list needed one request per attribute, then per unit, then per category) now arrive with that data already resolved, so they render in one pass. The status page's SDE row now reports when our database last ingested a CCP static-data release, rather than the freshness of the old SDE service.
