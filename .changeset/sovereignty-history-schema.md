---
"@jitaspace/db": minor
---

Added `SolarSystemSovereigntyPeriod` and `SovereigntySnapshot` (with the `SovereigntySource` enum: `esi`, `everef`) to record who held sovereignty over each K-space solar system over time. A period row covers one holder of one system from `startedAt` until `endedAt` (null while it still holds it), so "who held system S at time T" is a primary-key range lookup. `earliestStartedAt` bounds when an observed change happened, and `startedAt` is exact (ESI's `claimed_since`) where ESI reports it. `SovereigntySnapshot` lists the whole-map snapshots the history was built from, so gaps in coverage are visible.
