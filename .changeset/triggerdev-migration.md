---
"@jitaspace/background-jobs": minor
"@jitaspace/background-jobs-triggerdev": minor
"@jitaspace/web": patch
---

Migrate the EVE-data background jobs to Trigger.dev via a ports-and-adapters
split: platform-agnostic job logic in `@jitaspace/background-jobs`, run by the
Trigger.dev adapter (`@jitaspace/background-jobs-triggerdev`). Adds a Trigger.dev
background-jobs dashboard to the web `/status` page.
