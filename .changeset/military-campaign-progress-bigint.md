---
"@jitaspace/db": minor
"@jitaspace/background-jobs": patch
---

Fix `ingest-sde-military-campaign-objectives`, which was dying on every run with
`Value out of range for the type: integer out of range for type int4`.

A campaign objective's progress is counted in whatever unit its contribution
method reports — missions completed for `CompleteAgentMission`, but raw ISK for
the value-denominated ones — so the ISK objectives ship targets far past
2^31-1 and could not be written to an `Int` column. The six progress-magnitude
columns are now `BigInt`: `MilitaryCampaign.targetProgress` plus
`MilitaryCampaignObjective.targetProgress`, `maxProgressPerParticipant`,
`iskProgressInterval`, `lpProgressInterval` and `standingProgressInterval`. The
id columns beside them (faction, corporation, character) stay `Int` — EVE's id
ranges fit comfortably.

Requires a schema push.

The transform emits `bigint` rather than `number` for those columns, which
matters beyond the column type: `recordsAreEqual` compares `typeof` before
value, so a `number` diffed against the `bigint` Prisma reads back would have
marked every objective modified on every run.
