---
"@jitaspace/db": minor
---

Model public contracts in full: one `Contract` table (the empty per-type `AuctionContract`, `CourierContract` and `ItemExchangeContract` tables are folded in) with start/end locations as `BigInt` (Upwell structures), region/system/station foreign keys, ISK as `Float` like ESI, and a snapshot timeline (`firstSeenAt`, `lastSeenAt`, `endReason`). New tables: `ContractItem`, `ContractBid`, `DynamicItem` with its rolled `DynamicItemDogmaAttribute`/`DynamicItemDogmaEffect` values, and `ContractDynamicItem` linking mutated items to the contracts they are listed in. Already applied to production.
