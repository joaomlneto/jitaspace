---
"@jitaspace/web": patch
---

Reworked the market page layout. On desktop the market groups sidebar now stays in view while you scroll the orders, and each item opens with its lowest sell and highest buy price (and where they are), with sell and buy orders on tabs you can link to. On phones the market tree no longer fills the screen before the item: it opens from a "Browse market" button instead, and order rows stay on one line. Order expiry dates are now correct for 90-day orders, which used to show as already expired.

Added a Price history tab to every market item: the daily median price with each day's min/max, 5- and 20-day moving averages, a Donchian channel and traded volume, for any region, over one month to the full year, with the daily figures available as a table.
