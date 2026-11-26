---
"@jitaspace/background-jobs": minor
---

Added the `esi-sync-industry-cost-indices` job. Every hour it records ESI's industry cost indices, writing only the systems whose indices changed. When it has fallen behind (a deploy, an outage), it first replays the hours it missed from EVE Ref's archive. `scripts/bootstrapIndustryCostIndices.ts` fills the history from EVE Ref's archive (from 2017) before the job's first run.
