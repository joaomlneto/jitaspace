---
"@jitaspace/web": patch
---

Reworked how EVE entity details are loaded across the site. The names, portraits, avatars, tickers and badges shown for characters, corporations, alliances, factions, item types, stations, structures, solar systems and more are now fetched by the app itself and passed into a shared, presentation-only component library.

This is a behind-the-scenes change — pages look and behave the same — but it keeps the shared interface components independent of the EVE API client, which makes the app quicker to build on and less prone to data-loading glitches.
