---
"@jitaspace/web": minor
---

Added a compact, data-first redesign of the Active Wars page, available as an opt-in under **Settings → Experimental → "New Active Wars page"**. When off (the default), the existing table is unchanged.

- **At-a-glance header** — active, starting, ending, in-combat, total ISK destroyed, and ships lost.
- **Belligerents** — leaderboards of the corporations and alliances declaring the most wars, and the heaviest current fights by ISK destroyed.
- **All wars** — every war with a clear aggressor-vs-defender damage balance (who is destroying more ISK), filterable by lifecycle (Active / Starting / Ending) and by mutual / open-for-allies / in-combat, sortable, and switchable between a compact row layout and a dense sortable table.

Every figure comes straight from the game data; the previous made-up "activity" score was removed in favour of real ISK-destroyed, ship-kill, and duration numbers.
