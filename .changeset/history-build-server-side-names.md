---
"@jitaspace/web": patch
---

Build pages under Change History now show entity names immediately. They used to fetch each name separately as the list rendered, so a big patch appeared as a wall of `#587` placeholders that filled in slowly; names are now looked up on the server and arrive with the page. Skins, regions, dogma attributes, factions, stations and every other kind get a name too — previously only items did.
