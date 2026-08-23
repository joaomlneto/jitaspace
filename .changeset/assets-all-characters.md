---
"@jitaspace/web": minor
---

The Assets page now shows every logged-in character's assets at once instead of only the selected one, so items held across alts appear together — a station where two characters both keep things is one location holding everything, rather than one view per character. A "Filter by character" dropdown narrows it back down, and if a character's session can't be loaded the page says so instead of quietly leaving them out of a total that claims to cover everyone.

One trade-off comes with it: assets are paged, and the page now waits for every character's pages before rendering rather than filling in as each page arrives. Expect a longer wait before the table appears, and less waiting overall — the pages are fetched concurrently rather than one after another.
