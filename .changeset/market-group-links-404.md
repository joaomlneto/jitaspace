---
"@jitaspace/web": patch
"@jitaspace/ui": patch
---

Fixed the "Market Group" link on item pages leading to a "page not found" error. It now opens the market browser. The same link appears in the market breadcrumbs and was broken there too.

Also hardened the category, group and market-group links so a missing value can never produce a broken address.
