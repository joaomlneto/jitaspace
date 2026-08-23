---
"@jitaspace/background-jobs": patch
---

Make `@jitaspace/background-jobs` type-check clean.

`recordsAreEqual` was constrained to `T extends Record<string | number | symbol, unknown>`, which Prisma model types can't satisfy — they're interfaces with no index signature. That made passing it to `compareSets` from `updateTable<DbType extends object>` a type error. The constraint is now `object`, with indexing done through a record view; runtime behaviour is unchanged.

`scrapeHoboleaksAgentTypes` now names its result type (`BatchStepResult<"agentTypeChanges">`). `defineJob`'s `Result` generic silently falls back to its `unknown` default once the payload is given explicitly — TypeScript won't infer the remainder of a type argument list — so the handler's return value was untyped and its tests couldn't read `result.stats`.

No functional change.
