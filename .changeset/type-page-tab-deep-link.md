---
"@jitaspace/web": patch
---

Item type pages can now be deep-linked to a specific tab. Visiting `/type/{typeId}/{tab}` (for example `/type/587/market`) opens the type page with that tab already selected. Supported tabs are `overview`, `attributes`, `market`, `description`, and `history`; an unknown tab just opens the default Overview tab.
