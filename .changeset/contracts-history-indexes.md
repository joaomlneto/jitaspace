---
"@jitaspace/db": patch
---

Contract history indexes: `Contract(issuerId, contractId)`, `Contract(issuerCorporationId, contractId)` and `ContractItem(typeId, contractId)` replace the single-column `issuerId`, `issuerCorporationId` and `typeId` indexes, so a character's, corporation's or type's contracts read newest first a page at a time.
