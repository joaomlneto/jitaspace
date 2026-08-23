---
"@jitaspace/db": patch
---

Corrected the documentation on `KillmailVictimItems.singleton`, which described it as "the unique ID of the item". It is not an item ID, and it is not the assets API's `is_singleton` boolean either — across a full day of killmails (228,676 items) it takes only two values: `0` for an ordinary item, including fitted and assembled modules, and `2` for a blueprint copy.
