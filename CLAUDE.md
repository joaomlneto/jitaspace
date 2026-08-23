# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JitaSpace is a Turborepo + pnpm monorepo for an EVE Online companion web app (mail, assets, market orders, wallet, killmails, rich-text rendering of EVE's HTML, and scheduled background data sync). The main product is `apps/web`, a Next.js 16 app deployed to Vercel and live at [jita.space](https://www.jita.space).

> Two sibling docs cover the same ground for other tools: `AGENTS.md` (concise agent guide with per-area file map) and `.github/copilot-instructions.md` (detailed build/CI guide). Keep this file consistent with them when making changes.

## Package Manager

Use **pnpm exclusively** — the root `preinstall` hook runs `only-allow pnpm`, so `npm install`/`yarn` fail. Pinned to `pnpm@11.3.0`; Node `>=24.15.0` (see `.nvmrc`).

```bash
pnpm install                    # install all workspace dependencies
pnpm install --frozen-lockfile  # CI-safe install (does not alter lockfile)
```

## Key Commands

```bash
pnpm dev            # all dev servers (turbo dev --parallel)
pnpm build          # build all packages/apps
pnpm test           # Jest unit tests across workspaces (writes coverage/)
pnpm test:watch     # Jest watch mode
pnpm lint           # ESLint (flat config) + manypkg workspace checks
pnpm lint:fix       # auto-fix lint issues
pnpm type-check     # tsc --noEmit across all workspaces
pnpm format         # Prettier (also sorts imports)
pnpm db:generate    # generate Prisma client from packages/db/prisma/schema.prisma
pnpm db:diff        # read-only: show what db:push WOULD change (run this first)
pnpm db:push        # apply the Prisma schema to the DB (also runs db:generate)
pnpm kubb:generate  # generate API clients from OpenAPI specs
pnpm cypress:run    # run web E2E tests headlessly
pnpm cypress:open   # open Cypress runner
pnpm clean          # remove all node_modules
pnpm clean:workspaces # clean workspace build output via turbo
```

### Running a single test

Jest suites live in 16 workspaces — `apps/web` plus most `packages/*` (`hooks`, `ui`, `eve-components`, `background-jobs`, `auth`, `auth-utils`, `utils`, `tiptap-eve`, …). `apps/web` runs Jest behind `pnpm with-env` (loads root `.env`); packages run Jest directly. From the workspace that owns the test:

```bash
pnpm test path/to/file.test.ts          # a single file
pnpm test -- -t "test name substring"   # by test name
pnpm test:watch                          # interactive watch
```

Packages that touch the validated env need `SKIP_ENV_VALIDATION=1` (several set it in their own `jest.config.ts`).

## Critical: code generation before build

Two generated artifacts are prerequisites and the Turbo `build`/`type-check` tasks depend on them. After a fresh clone, a schema change, or a `swagger.json`/`kubb.config.ts` change, run them explicitly:

```bash
pnpm db:generate     # Prisma client → packages/db
pnpm kubb:generate   # OpenAPI → TypeScript clients in packages/*-client/src/generated/
```

If you see import errors for `@jitaspace/db` or `@jitaspace/esi-client`, these haven't run yet.

**If you linted before generating, the ESLint cache will keep failing you.** `pnpm lint` uses `--cache`, which keys on each linted file's contents rather than on the generated types it imports — so errors cached before codegen (typically `no-unsafe-*` on `prisma.*`) replay forever even after you regenerate, and the fix looks like it did nothing. The three codegen scripts above clear the cache; `build`/`dev`/`test`/`type-check` and the per-package `postinstall` hooks regenerate without clearing. Recover with `pnpm clean:eslint-cache` (use the script — the `rm` inside it aborts under zsh on unmatched globs).

**Never edit generated files directly.** Instead edit the source and regenerate:

- Prisma client → edit `packages/db/prisma/schema.prisma`, then `pnpm db:generate`
- API clients → edit the package's `swagger.json` / `kubb.config.ts`, then `pnpm kubb:generate`

## Applying schema changes to the database

**Deploying does not apply the schema.** `apps/web/vercel.json` runs `db:generate` (Prisma client codegen — required to compile) but **not** `db:push`. Applying a schema change to production is a separate, deliberate step you take by hand:

```bash
pnpm db:diff        # read-only — review the pending change first
pnpm db:push        # apply it
```

**Both commands hit whatever `DATABASE_URL` points at, and the root `.env` points at production CockroachDB.** Check the datasource line each one prints before you let a push proceed. `db:diff` is `prisma migrate diff --from-config-datasource --to-schema` — read-only, never writes; add `pnpm --filter @jitaspace/db db:diff:sql` for SQL rather than the summary. There is no `prisma/migrations` directory (`packages/db/prisma.config.ts` declares a path for one, but it has never existed), so `db push` is the only mechanism — and Prisma's own docs recommend against it in production. Treat every push as a manual, reviewed operation.

**Why the deploy no longer pushes.** It used to, and it broke 18 production deploys between 2026-08-05 and 2026-08-09. `db push` reconciles the database to _whatever `schema.prisma` sits on the commit being deployed_, so a PR branched **before** a schema-adding PR proposes **dropping** the newer tables. PR #691 — a type-check fix that never touched the schema — proposed dropping 33 populated tables (38,823 rows). Prisma refused and the build went red; the red build was the safety net. Two failure modes to recognise if you ever see them again:

- **`Use the --accept-data-loss flag …`** — `schema.prisma` on this commit is _behind_ the database. Rebase onto the commit that added the missing models. **Never add that flag to a build or run it unattended** — it drops the listed tables with no migration history to recover from. Dropping something on purpose is the one legitimate use, and it belongs in a deliberate expand/contract sequence: add the new shape and push, ship code that stops using the old one, then remove it from the schema and push again in a reviewed window. Never drop a column the currently-deployed code still selects.
- **`this schema change is disallowed because table "X" is locked …`** — CockroachDB v26.1+ creates tables with `schema_locked = true` by default, so a push that creates a table and then indexes it can fail _on the table it just created_, leaving the database **half-migrated** (the table exists, its index does not). Recover with the unlock the error's own `DETAIL:` line prints, then re-push and re-lock:

  ```sql
  ALTER TABLE "X" SET (schema_locked = false);
  -- re-run pnpm db:push, then:
  ALTER TABLE "X" SET (schema_locked = true);
  ```

**Push before you merge — the consequence of forgetting is inconsistent, and mostly quiet.** `cacheComponents` resolves every argument-free `"use cache"` read during the build prerender, so a schema change that lands on `main` unapplied hits those reads with a database error. What happens next depends on where the `catch` sits relative to the cache boundary, and both shapes exist in this repo:

- **`catch` inside the same function as `"use cache"` → silent.** The catch runs normally, `notFound()` wins, and the route is **prerendered as a 404 with a green build**. This is the majority: `regions`, `categories`, `agents`, `skills`, `ship-scanner`, `dogma/attributes`, `dogma/effects`, `lp-store`, `lp-store/all` — all bare `catch {}` with no Sentry capture, so nothing reports it.
- **`catch` outside the cache scope → loud.** Where `"use cache"` sits in a `data.ts` helper and the page catches around the call, the throw is not contained and the export dies. Only `active-wars` and `travel` are this shape; verified by building against an unreachable database, which exits on `app/active-wars/data.ts:153` despite the guard at `page.tsx:16-20`.
- **Tables no route reads → no signal at all.** The incident's own `NpcCorporation*` tables are written only by `packages/background-jobs`; that drift class gives a green build, a green site, and a Trigger.dev job failing where nobody is looking.

Reads behind `connection()` (e.g. `app/history/page.tsx:24`) or behind `await params` inside a `<Suspense>` boundary are request-time and unaffected either way.

## Environment variables & `SKIP_ENV_VALIDATION`

Copy `.env.example` to `.env` at the repo root. `apps/web/env.ts` validates env vars with Zod (server schema, plus `NEXT_PUBLIC_`-prefixed client schema) and `next.config.mjs` imports it unless `SKIP_ENV_VALIDATION` is set.

**For CI, lint, builds, or any environment without real secrets, set `SKIP_ENV_VALIDATION=1`** or the build/dev server aborts with env errors. Required vars for a real run include `DATABASE_URL`, `REDIS_URL`, `NEXTAUTH_SECRET`, `EVE_CLIENT_ID`, `EVE_CLIENT_SECRET` (full list in `.env.example` / `turbo.json` `globalEnv`).

## Repository Structure

```
apps/
  web/   # Next.js 16 (App Router) — the main product, deployed to Vercel.
  cli/   # Developer CLI utilities
packages/
  auth/ auth-utils/          # EVE Online SSO (OAuth2 PKCE + state), token seal/refresh
  db/                        # Prisma 7 client + PostgreSQL schema
  db-history/                # Separate Prisma client for the EVE build-history DB (/history)
  kv/                        # Redis client + Bull job queues
  esi-client/                # Kubb-generated ESI API client
  evekill-client/ evetycoon-client/ fuzzworks-market-client/  # more generated clients
  esi-metadata/ eve-data/    # ESI scopes/ID ranges; static EVE datasets
  hooks/                     # React Query hooks over ESI / third-party APIs
  ui/                        # Presentational Mantine components (dependency-light: no hooks/data fetching)
  eve-components/            # Data-aware EVE components (names, avatars, anchors, selects)
  eve-icons/ tiptap-eve/     # EVE icon set; EVE-HTML Tiptap extension
  datatable/ datatable-mantine/ datatable-tanstack/  # engine-agnostic table contract + adapters
  chat/                      # Discord-backed in-app chat
  background-jobs/           # Platform-agnostic EVE-data background job logic (source of truth)
  background-jobs-triggerdev/ # Trigger.dev adapter (active runner) for background-jobs
  utils/ sde-utils/          # shared utilities
tooling/
  eslint/ prettier/ tsconfig/  # shared presets (extend these, don't redefine)
```

> Note: there is no `apps/worker` — background jobs run on Trigger.dev (the
> `@jitaspace/background-jobs-triggerdev` adapter).

## Tech Stack

- **Runtime/Lang:** Node.js ≥24.15.0, TypeScript ~5.9
- **Monorepo:** Turborepo ~2.9 + pnpm 11
- **Frontend:** Next.js 16 (App Router), React 19, Mantine 9, Zustand
- **Data fetching:** TanStack React Query 5
- **DB / cache:** PostgreSQL + Prisma 7; Redis + Bull
- **Auth:** Custom EVE Online SSO OAuth2 flow (authorization code + PKCE)
- **Background jobs:** Trigger.dev — platform-agnostic logic in `@jitaspace/background-jobs`, run by the `background-jobs-triggerdev` adapter
- **API codegen:** Kubb 4 (OpenAPI → TypeScript). Keep `@kubb/*` at `>=4.38.0` — 4.37.x had codegen bugs (object-array collapse, `#`-prefixed keys).
- **Rich text:** Tiptap + EVE HTML extensions
- **Testing:** Jest 30 (unit). Cypress 15 is installed but the specs under `apps/web/cypress/e2e/` are still the stock Cypress example suite (they hit `example.cypress.io`, not this app) — treat the CI "Cypress" job as a build-and-boot smoke check, not E2E coverage.
- **Monitoring:** Sentry + Umami

## Key Conventions

- **Internal imports:** `@jitaspace/<name>` with `workspace:*` version specifiers in `package.json`.
- **Adding a new `@jitaspace/*` package to the web app:** if it ships TypeScript source, add it to `transpilePackages` in `apps/web/next.config.mjs`; server-only/Node-only deps go in `serverExternalPackages` instead (e.g. `bull`).
- **New dependencies** go in the consuming package's `package.json`, not root.
- **ESLint:** flat config only (`eslint.config.ts`); never `.eslintrc.*`. `apps/web` lints with `--flag unstable_native_nodejs_ts_config`.
- **TypeScript:** `moduleResolution: Bundler`, `strict`, `noUncheckedIndexedAccess`; all packages extend `tooling/tsconfig/base.json`.
- **Prettier import order** (via `@ianvs/prettier-plugin-sort-imports`): React/Next → third-party → `@jitaspace/*` types → `@jitaspace/*` values → relative.
- **URL-synced filter state (nuqs):** use `useQueryState`/`useQueryStates` for filter/sort/view state that should be shareable (see `app/mail/page.client.tsx`, `components/Wars/WarRoom/WarList.tsx`). Two rules: (1) the consuming component **must** sit under a `<Suspense>` boundary — nuqs calls `useSearchParams()` internally, and without one the route silently drops out of static prerendering under `cacheComponents`; (2) prefer a validating parser (`parseAsInteger`, `parseAsStringLiteral`) over `parseAsString` so hand-edited URLs can't reach an API. Page-owned params may use bare names (`status`, `sort`); a **shared** component that adopts nuqs must namespace via `urlKeys` to avoid colliding with its host page.
- **Build note:** `apps/web` sets `typescript.ignoreBuildErrors: true` in CI, so TS errors don't fail the Next build — but they still fail `pnpm type-check`. Always run `pnpm type-check` to validate types.

## Changesets

```markdown
---
"@jitaspace/package-name": patch | minor | major
---

Description of the change.
```

patch = bug fix/internal; minor = new feature/export; major = breaking.

**When a changeset is required:**

- **Publishable packages — always.** Only four workspaces are publishable (`auth-utils`, `db`, `esi-metadata`, `tiptap-eve`); every other workspace is `"private": true`. A change to one of these needs a changeset with a developer-facing description.
- **`@jitaspace/web` — always for user-visible changes.** `web` is private and never published, but its changesets are the release-notes queue — the large majority of pending changesets are `web` — so they **must be end-user-readable** ("Fixed mail search not returning results"), not implementation detail. If a change elsewhere produces a visible web-app effect, add `"@jitaspace/web": patch` with a user-facing note.
- **Other private packages — optional.** Internal-only fixes routinely ship without one (e.g. PRs #651 and #652 in `background-jobs`). Add one when the change is worth recording for other developers. The changeset-bot's "No Changeset found" warning on such a PR is expected and can be ignored.

> Note: there is no release workflow — `changeset version`/`publish` are never run in CI, so changesets accumulate as a changelog rather than driving version bumps.

## CI

Three GitHub Actions run on push/PR (all set `SKIP_ENV_VALIDATION=1`):

- **`type-check.yml`:** `pnpm install --frozen-lockfile` → `pnpm type-check`. A hard gate — the repo is expected to be **green**, so a type error fails the PR. No explicit codegen step: the turbo `type-check` task depends on the Prisma and Kubb generators, so a clean checkout produces them itself.
- **`cypress.yml`:** spins up CockroachDB + Redis → push DB schema → `pnpm build` → start web → run Cypress (parallel). Since the specs are the stock examples, this effectively gates only "the build succeeds and the server boots".
- **`sonarcloud.yml`:** `pnpm install --frozen-lockfile` → `pnpm test` (coverage) → SonarQube scan. New code must keep coverage above the quality gate.

**No workflow runs `pnpm lint`.** ESLint's only automatic gate is the local `.githooks/pre-commit` hook, which is bypassable with `--no-verify` and dormant in git worktrees — so run `pnpm lint` yourself before pushing. (`manypkg check` runs as part of it, and it fails on a dependency declared at different versions across workspaces.)

Local equivalent before pushing: `pnpm db:generate` → `SKIP_ENV_VALIDATION=1 pnpm build` → `pnpm lint` → `pnpm type-check` → `pnpm test`.

> After merging `main`, re-run `pnpm db:generate` before trusting a type-check: a schema change plus a stale client makes valid columns look missing and cascades into unrelated errors. If a fresh worktree reports errors inside a `dist/` or `prisma/generated/` path, that is a stale `tsbuildinfo` or an unbuilt package, not repo state — clear `node_modules/.cache` and rebuild.

## Where to look first

| Area              | Path                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------- |
| Turbo pipeline    | `turbo.json`                                                                             |
| Web config / env  | `apps/web/next.config.mjs`, `apps/web/env.ts`                                            |
| Web routes        | `apps/web/app/`                                                                          |
| DB schema         | `packages/db/prisma/schema.prisma`                                                       |
| ESI client gen    | `packages/esi-client/kubb.config.ts`, `packages/esi-client/swagger.json`                 |
| Auth              | `packages/auth/index.ts` (SSO flow in `packages/auth/src/oauth/`)                        |
| Shared tooling    | `tooling/eslint/src/base.ts`, `tooling/prettier/index.mjs`, `tooling/tsconfig/base.json` |
| Test config (web) | `apps/web/jest.config.ts`, `apps/web/cypress.config.ts`                                  |
