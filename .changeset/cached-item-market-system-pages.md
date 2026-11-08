---
"@jitaspace/web": patch
---

Item, item market, solar system, item group and LP store pages now load from the cache instead of being rebuilt on every visit, so they open faster. A brief database hiccup no longer shows a "not found" page for an item, group or LP store that exists. The History tab on item, race, faction, station, constellation, region, dungeon, mission and epic arc pages now loads when you open it, so those pages no longer wait for it, and keep working when the change history is unavailable.
