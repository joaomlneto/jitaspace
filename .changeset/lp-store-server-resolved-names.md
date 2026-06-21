---
"@jitaspace/web": patch
---

Sped up the LP Store tables. Item and corporation names now arrive already resolved with the page instead of being fetched one row at a time in your browser, so the tables render their names instantly with no "loading" flicker — most noticeable on the "show all offers" page and large corporation stores.
