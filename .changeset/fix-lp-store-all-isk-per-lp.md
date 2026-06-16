---
"@jitaspace/web": patch
---

Fixed the LP Store "All offers" page (`/lp-store/all`) showing incorrect ISK/LP values and ranking. Market prices for each offer's reward item were not being loaded on that page, so sorting by "Jita 5% Buy/Sell ISK/LP" produced wrong results that didn't match the individual corporation pages — the highest ISK/LP offers were no longer at the top. Offers that cost no loyalty points no longer display "Infinity ISK/LP".
