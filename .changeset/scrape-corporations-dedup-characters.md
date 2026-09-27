---
"@jitaspace/background-jobs": patch
---

`scrape-esi-corporations` no longer aborts a batch when the same character is
both a corporation's founder and its CEO, or founded several corporations in
the batch. The batch synced that character twice, and `compareSets` rejects a
duplicated record with a `NonRetriableError`, failing the batch — and with it
the run, since batches are 1,000 corporations and nearly every one contains
such a corporation. Character IDs are now deduplicated first, as
`scrape-esi-npc-corporations` already did.
