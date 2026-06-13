---
"@jitaspace/background-jobs": minor
"@jitaspace/background-jobs-triggerdev": minor
"@jitaspace/eve-scrape": minor
"@jitaspace/web": patch
---

Migrate the EVE-data background jobs from Inngest to Trigger.dev via a
ports-and-adapters split: platform-agnostic job logic in
`@jitaspace/background-jobs`, an Inngest adapter (`@jitaspace/eve-scrape`, now
gated off behind `INNGEST_ENABLED`), and a new active Trigger.dev adapter
(`@jitaspace/background-jobs-triggerdev`). Adds a Trigger.dev jobs dashboard to
the web `/status` page alongside the existing Inngest one.
