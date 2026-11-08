---
"@jitaspace/background-jobs": minor
---

Add the `esi-sync-public-contracts` job (every 30 minutes, at :14 and :44 UTC): it lists ESI's public contracts in every region, inserts new ones with their items, mutated items (`DynamicItem*`, `ContractDynamicItem`) and auction bids, reopens contracts that come back, and ends the ones a complete listing no longer shows.

- `helpers/contractTimeline.ts`: the pure timeline rules (region completeness against its recent median, `endReason` from expiry and the 2-hour gap rule). A contract ends on its first miss in a complete listing. ESI rounds an auction's time left up, so each auction keeps the lowest expiry any listing gave, and one is only `RemovedBeforeExpiry` if it went missing more than a listing interval before it.
- `helpers/contractTimelineStore.ts`: applies one region's listing per transaction, with idempotent bulk writes. Each region's listing history (last Last-Modified, last complete listing, recent counts) lives in the job's Redis state, so no schema change is needed.
- `helpers/publicContractsDb.ts`: idempotent writes for references, items, mutated items and bids; `helpers/esiRequestGate.ts`: concurrency, ESI error-limit pauses, 420/429/`Retry-After`, bounded retries.
