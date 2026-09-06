---
"@jitaspace/background-jobs": patch
---

Exclude the SDE-owned columns wherever an ESI scraper diffs a table the SDE
co-owns. Asteroid belts, stars, and NPC-corporation CEO characters were compared
against columns ESI never supplies, so every one of those rows reported as
modified and took an UPDATE on every run — roughly 49,000 needless writes per
`scrape-esi-solar-systems` pass. `tests/sdeOwnedColumnStripping.test.ts` now
fails if any diff site stops excluding them.
