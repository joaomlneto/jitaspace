---
"@jitaspace/background-jobs": minor
---

Add the `esi-sync-public-contracts` job (every 30 minutes, at :14 and :44 UTC): it lists ESI's public contracts in every region, inserts new ones with their items, mutated items (`DynamicItem*`, `ContractDynamicItem`) and auction bids, and ends or reopens contracts with the same timeline rules as the EVE Ref snapshot ingest it replaces. The outstanding set comes from `Contract` (`isDeleted = false`); per-region history, contracts missing once and the item queue live in Redis under `contracts:public:esi-sync`. Adds `helpers/contractTimeline.ts` (pure timeline rules), `helpers/esiRequestGate.ts` (concurrency, ESI error-limit pauses, 420/429/`Retry-After`, bounded retries) and `helpers/publicContracts.ts`.
