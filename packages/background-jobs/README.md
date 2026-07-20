# @jitaspace/background-jobs

Platform-agnostic EVE Online background-job logic. Each job is defined once here
against an abstract execution context and run by a platform **adapter**:

- **Trigger.dev** — `@jitaspace/background-jobs-triggerdev` (the active runner).

This package imports **no** platform SDK (no `@trigger.dev/*`); the abstract
context keeps the jobs portable to another adapter if one is ever added.

## Defining a job

```ts
import { defineJob } from "../core";

export const scrapeEsiRegions = defineJob<{ batchSize?: number }>({
  id: "scrape-esi-regions", // stable: also the Trigger.dev task id
  name: "Scrape Regions",
  trigger: { type: "event" }, // or { type: "cron", cron: "TZ=UTC 30 * * * *" }
  concurrencyLimit: 1, // singleton: true for one-at-a-time
  retries: 5,
  handler: async (ctx) => {
    ctx.payload.batchSize; // input (the job payload)
    await ctx.run("step name", async () => {
      /* a durable step on the adapter */
    });
    await ctx.send("other-job-id", { ... }); // fire-and-forget
    await ctx.invoke("other-job-id", { ... }); // trigger + await result
    await ctx.sleep("rate limit", "60s");
    return { stats: { ... } };
  },
});
```

All jobs are collected in `jobs/index.ts` (`jobs` array + `registry`). The
adapters build their platform functions/tasks from that single list, and
`ctx.send`/`ctx.invoke` resolve targets by id through the registry.

## Notes

- `kv` (Redis/Bull queues) and `chat` (Discord) are **lazy** (`getKv`,
  `getRedis`, `postUpdateCard`) so importing a job doesn't open a connection —
  important for the Trigger.dev build, which imports every task module to index it.
- `ctx.run` is a plain call on Trigger.dev (the whole task body re-runs on
  retry). All jobs here are idempotent.
- The Redis queue processors drain via `drainQueue` (a bounded, returns-cleanly
  loop) instead of Bull's never-returning `.process()`.

## Scripts

```
pnpm type-check   # tsc --noEmit
pnpm test         # jest (registry + util tests)
pnpm lint
```
