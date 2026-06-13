---
"@jitaspace/db": minor
"@jitaspace/kv": minor
"@jitaspace/chat": minor
"@jitaspace/eve-scrape": patch
"@jitaspace/web": patch
---

refactor(db,kv,chat): replace self-initialising singletons with factories

`@jitaspace/db`, `@jitaspace/kv`, and `@jitaspace/chat` previously read
environment variables at module load. They now export factory functions
instead of singletons:

- `@jitaspace/db` — `createPrismaClient({ connectionString, logQueries? })`
- `@jitaspace/kv` — `createKv({ redisUrl })` (async, returns `{ redis, kv }`)
- `@jitaspace/chat` — `createChat({ discordBotToken?, discordUpdatesChannelId? })`

Apps build the instance from their own validated env in a thin local shim.
`eve-scrape` and `web` have been updated accordingly.
