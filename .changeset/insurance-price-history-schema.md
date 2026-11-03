---
"@jitaspace/db": minor
---

Added `InsurancePrice` and `InsurancePriceSnapshot` (with the `InsurancePriceSource` enum: `esi`, `everef`) to keep the history of ESI's `GET /insurance/prices`. `InsurancePrice` holds one row per ship type per stretch of unchanged prices (`validFrom`/`validUntil`, null while current), with each level's cost and payout as ESI reports them, so the prices at any time are the row covering it. `InsurancePriceSnapshot` records every observation of the list, including those that changed nothing, as the coverage of that history.
