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
- `src/trigger/index.ts` — loops `registry.jobs` and registers one Trigger task
  per job, so the set can't drift from the registry. Trigger v4 indexes by
  registration, not export, so nothing here is exported.

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

Deployment runs through the official **Trigger.dev GitHub + Vercel integrations**
(connect the repo/project from the Trigger.dev dashboard) — there is no GitHub
Action or `TRIGGER_ACCESS_TOKEN` secret in this repo. For a manual/local deploy:
`pnpm deploy` (runs `trigger.dev deploy`).

Because this is a monorepo, set these in the Trigger.dev project's **build
settings** (Console → Project → Settings):

| Setting             | Value                                                   |
| ------------------- | ------------------------------------------------------- |
| Trigger config file | `packages/background-jobs-triggerdev/trigger.config.ts` |
| Install command     | `pnpm install`                                          |
| Pre-build command   | `pnpm db:generate`                                      |

The **pre-build command** is load-bearing: modern-mode `prismaExtension` does
**not** run `prisma generate`, and the native build server only runs
`pnpm install` + the bundle (never `turbo build`), so the Prisma client
(`packages/db/prisma/generated`) would be missing when esbuild bundles
`db/index.ts`. `pnpm db:generate` runs after install and before the build, and is
offline (no `DATABASE_URL` needed). The kubb-generated `*-client` packages already
self-generate via their own `postinstall`, so they're present after install.

## Status dashboard

The `/status` page in `apps/web` shows a Trigger.dev jobs dashboard backed by the
Management API (`runs.list`), authenticated with `TRIGGER_SECRET_KEY`.

## Error reporting (Sentry)

Task failures report to Sentry (same project as `apps/web`) via
`src/trigger/init.ts`: it calls `Sentry.init` and registers a global
`tasks.onFailure` hook. It **reuses the web app's Sentry env vars** —
`NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` —
which are set in Vercel and synced to the Trigger env by the Vercel integration,
so there's nothing extra to configure. Reporting is gated to production
(`NODE_ENV === "production"`), so local `trigger.dev dev` runs stay quiet. When
`SENTRY_AUTH_TOKEN` is present, `sentryEsbuildPlugin` also uploads source maps at
deploy time for readable stack traces (skipped otherwise).
