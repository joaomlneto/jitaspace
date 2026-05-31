---
"@jitaspace/web": patch
"@jitaspace/eve-scrape": patch
---

Upgrade the Inngest TypeScript SDK from v3 to v4. Triggers now live in the `createFunction` options object, `EventSchemas` is replaced with per-event `eventType()`/`staticSchema()` definitions, the client sets `checkpointing.maxRuntime` (with `maxDuration` on the Vercel serve route) for serverless, and dev mode is opted into outside production.
