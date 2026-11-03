---
"@jitaspace/background-jobs": minor
"@jitaspace/db": minor
---

Add the `esi-sync-public-contracts` job (every 30 minutes, at :14 and :44 UTC): it lists ESI's public contracts in every region, inserts new ones with their items, mutated items (`DynamicItem*`, `ContractDynamicItem`) and auction bids, and ends or reopens contracts with the EVE Ref snapshot ingest's timeline rules.

The timeline is now shared state in the database, so the job and the EVE Ref ingest (now `scripts/ingest-everef-contracts.ts`, `pnpm ingest-everef-contracts --state <file>`) can run in any order, or at the same time, and leave the same rows:

- `@jitaspace/db`: new models `ContractRegionObservation` (each region listing applied, keyed by its Last-Modified) and `ContractAbsence` (contracts missing from their region's latest listing, with an exact lastSeen).
- `helpers/contractTimeline.ts`: a pure engine whose result depends only on the set of observations (lastSeen a max, firstSeen a min, misses and completeness read off the log), with `contractTimelineStore.ts` applying one region listing per transaction under a per-region advisory lock.
- `helpers/publicContractsDb.ts`: the shared, idempotent writes for references, items, mutated items and bids; `helpers/esiRequestGate.ts`: concurrency, ESI error-limit pauses, 420/429/`Retry-After`, bounded retries.
