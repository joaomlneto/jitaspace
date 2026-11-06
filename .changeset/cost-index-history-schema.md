---
"@jitaspace/db": minor
---

Added `SolarSystemCostIndex` and `SolarSystemCostIndexSnapshot`: every solar system's industry cost indices over time, as a change log (one row each time a system's indices change) plus a record of every snapshot taken, so the values at any past moment can be looked up and gaps in the record told apart from stretches where nothing changed.
