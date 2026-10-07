---
"@jitaspace/background-jobs": minor
---

Added the `esi-track-incursions` job. Every 5 minutes it polls ESI's active incursions, diffs them against the database in one transaction, records each change as an `IncursionEvent`, and marks incursions ESI stops listing as ended instead of deleting them. A new incursion keeps who held its staging system's sovereignty when it appeared.
