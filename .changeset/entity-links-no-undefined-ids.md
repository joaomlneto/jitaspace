---
"@jitaspace/web": patch
---

Fixed race, bloodline, corporation, character, faction, type and solar-system links on entity pages briefly pointing at a broken address while the page was still loading. Opening a character, station, structure, planet, bloodline, alliance or race page during that moment could produce a link to a page that does not exist. Those rows now show the name unlinked until the destination is known, and become links once the data arrives.

Also stopped the site footer from pre-loading the About, Support and Status pages on every page view. They are now fetched when you actually click them.
