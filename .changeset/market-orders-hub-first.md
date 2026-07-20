---
"@jitaspace/hooks": patch
"@jitaspace/web": patch
---

Market item pages now show orders sooner: order data for the major trade hubs (Jita, Amarr, Dodixie, Rens, Hek) is fetched first, so the buy/sell tables fill in almost immediately instead of waiting on the long tail of low-volume regions. All regions are still loaded — only the order in which they're requested changed.
