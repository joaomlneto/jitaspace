---
"@jitaspace/esi-metadata": patch
---

Added curated descriptions for the nine ESI scopes that had none, so
`getScopeDescription` no longer falls back to echoing the raw scope string for
them: access lists, character activities (mercenary tactical operations),
character and corporation freelance jobs, corporation projects, character and
corporation structures (mercenary dens, skyhooks, sovereignty hubs), and the
two new-convention scopes `esi.activity.char:read` (military campaigns) and
`esi.cosmetic.char:read` (SKINR licenses and Paragon Hub listings).

Descriptions are derived from the endpoints each scope actually gates, and note
the in-corporation role a scope additionally requires where the spec declares
one (`Project_Manager` for corporation freelance jobs and project contributors,
`Station_Manager` for corporation structures).
