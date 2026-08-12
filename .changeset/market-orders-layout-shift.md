---
"@jitaspace/hooks": patch
"@jitaspace/web": patch
---

Fixed the market page jumping around while it loads. The buy and sell order tables now hold their full height from the start and fill in once, instead of growing a row at a time as each region's orders arrived and pushing the rest of the page down. Switching between items also no longer briefly shows the previous item's orders, and a region that fails to respond no longer silently drops the orders that did load.
