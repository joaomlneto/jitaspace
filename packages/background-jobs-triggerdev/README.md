# @jitaspace/background-jobs-triggerdev

The **Trigger.dev** adapter for `@jitaspace/background-jobs` — the active runner
for the EVE-data background jobs. Every platform-agnostic job is wrapped as a
Trigger.dev task (or a scheduled task for the cron job) and exported from
`src/trigger/index.ts`.

## Layout

- `trigger.config.ts` — project ref (from `TRIGGER_PROJECT_REF`), `dirs`,
  `maxDuration`, and the Prisma build extension (modern mode).
- `src/adapter.ts` — `toTriggerTask(job)`: maps the `JobContext` primitives onto
  Trigger.dev (`run`→direct exec, `send`→`tasks.trigger`, `invoke`→
  `triggerAndWait().unwrap()`, `sleep`→`wait.for`, `singleton`/`concurrencyLimit`→
  `queue.concurrencyLimit`, `retries`→`retry.maxAttempts = retries + 1`,
  `NonRetriableError`→`AbortTaskRunError`).
- `src/trigger/index.ts` — one literal named export per job, so the build can
  statically index each task. Generated from the registry; keep in sync.

## Setup

1. Create a Trigger.dev project; set `TRIGGER_PROJECT_REF` (or edit the
   placeholder in `trigger.config.ts`).
2. Provide the worker's runtime env in the Trigger.dev project: `DATABASE_URL`,
   `REDIS_URL`, and optionally `DISCORD_BOT_TOKEN` / `DISCORD_UPDATES_CHANNEL_ID`.

## Commands

```
pnpm dev      # trigger.dev dev (local) — needs TRIGGER_PROJECT_REF + a logged-in CLI
pnpm deploy   # trigger.dev deploy
pnpm type-check
```

## Deploying

CI deploys on push to `main` via `.github/workflows/triggerdev-deploy.yml`
(`pnpm db:generate` then `trigger.dev deploy`). It needs repo secrets
`TRIGGER_ACCESS_TOKEN` and `TRIGGER_PROJECT_REF`.

**Prisma 7:** modern-mode `prismaExtension` does **not** run `prisma generate`,
so the generated client must exist before deploy (the CI step handles this).

## Status dashboard

The `/status` page in `apps/web` shows a Trigger.dev jobs dashboard backed by the
Management API (`runs.list`), authenticated with `TRIGGER_SECRET_KEY`.
