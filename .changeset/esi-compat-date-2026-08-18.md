---
"@jitaspace/esi-metadata": minor
---

Regenerated the ESI scope and endpoint metadata against compatibility date
2026-08-18. Adds the `esi.activity.char:read` and `esi.cosmetic.char:read`
scopes together with the endpoints behind them (SKINR cosmetics, Paragon Hub
and Military Campaigns).

These two scopes are the first to use ESI's new `esi.{domain}.{subject}:{action}`
naming convention, which runs alongside the legacy `esi-{domain}.{action}.v{N}`
form rather than replacing it. Consumers that pattern-match scope strings need
to accept both. The `generate-scopes` description parser was only matching the
legacy prefix, so a curated description written for a new-style scope was
invisible to it and the "no curated description" warning would never clear.
