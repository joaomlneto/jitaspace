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
pnpm format:check   # Prettier in check mode — what lint.yml runs
pnpm db:generate    # generate Prisma client from packages/db/prisma/schema.prisma
pnpm db:diff        # read-only: show what db:push WOULD change (run this first)
pnpm db:push        # apply the Prisma schema to the DB (also runs db:generate)
pnpm kubb:generate  # generate API clients from OpenAPI specs
pnpm cypress:run    # run web E2E tests headlessly
pnpm cypress:open   # open Cypress runner
pnpm clean          # remove all node_modules, from the root down
pnpm clean:workspaces # `turbo clean` — runs each workspace's own clean script.
                      # NOTE: 27 of those delete the workspace's node_modules as
                      # well as its build output, so this uninstalls dependencies
                      # too; it is not a build-output-only clean. Re-run
                      # `pnpm install` afterwards.
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

**If a stale ESLint cache is failing you.** `pnpm lint` uses `--cache`, which keys on each linted file's contents rather than on the generated types it imports, so errors cached before codegen (typically `no-unsafe-*` on `prisma.*`) can replay after you regenerate and the fix looks like it did nothing. The turbo `lint` task now declares the same `db:generate`/`kubb:generate` edges as `build` and `type-check`, so `pnpm lint` can no longer run ahead of the generators — but a cache written by an older checkout, or by invoking `eslint` directly in a package, still can. Recover with `pnpm clean:eslint-cache` (use the script — the `rm` inside it aborts under zsh on unmatched globs).

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

**Push before you merge — the consequence of forgetting used to be quiet, and is now loud.** `cacheComponents` resolves every argument-free `"use cache"` read during the build prerender, so a schema change that lands on `main` unapplied hits those reads with a database error. What happens next depends on where the `catch` sits relative to the cache boundary:

- **`catch` inside the same function as `"use cache"` → silent.** The catch runs normally, `notFound()` wins, and the route is **prerendered as a 404 with a green build**. Nine routes had this shape (`regions`, `categories`, `agents`, `skills`, `ship-scanner`, `dogma/attributes`, `dogma/effects`, `lp-store`, `lp-store/all`). **All nine were fixed on 2026-08-30**, so no route in `apps/web` has it today — the shape is described here only so you can recognise and reject it. See **Never catch a database error inside a `"use cache"` scope** below.
- **`catch` outside the cache scope → loud.** Where `"use cache"` sits in a `data.ts` helper and the page catches around the call, the throw is not contained and the export dies. Only `active-wars` and `travel` are this shape; verified by building against an unreachable database, which exits on `app/active-wars/data.ts:153` despite the guard at `page.tsx:16-20`.
- **Tables no route reads → no signal at all.** The incident's own `NpcCorporation*` tables are written only by `packages/background-jobs`; that drift class gives a green build, a green site, and a Trigger.dev job failing where nobody is looking.

Reads behind `connection()` (e.g. `app/history/page.tsx:24`) or behind `await params` inside a `<Suspense>` boundary are request-time and unaffected either way.

## Never catch a database error inside a `"use cache"` scope

**A `catch` that swallows a database failure inside a cached scope turns a blip into a cached 404.** `notFound()` is not an error — it is a _successful_ 404 render, so Next.js stores it as a normal ISR entry. With `cacheLife("days")` (`stale 300 / revalidate 86400 / expire 604800`) that 404 is served to everyone for **up to 24 hours after the database recovers**, and nothing reports it.

This is not only a build-time hazard. On 2026-08-29 the production deployment was six days old and healthy when the CockroachDB cluster hit its monthly Request Unit limit and was disabled (`Too many database connections opened: This cluster has reached its Request Unit limit for the month and is now disabled`). Five routes happened to run their daily background revalidation during the outage window (15:08–17:43 UTC) and each latched a 404; the four routes that revalidated outside the window were untouched. Exposure is to **the moment of render**, not to query cost — `/lp-store/all` runs a strict superset of `/lp-store`'s queries and stayed healthy while `/lp-store` 404ed.

The rule:

- **Let the read throw.** At build time this fails the build loudly, which is the desired signal. At request time it produces a transient error instead of a stored 404 — nothing wrong is written to the cache, so the route recovers as soon as the database does.
- **`notFound()` is still correct for a genuinely absent row**, and is legitimately cached. `app/ship-scanner/page.tsx` is the worked example: it reads with `findUnique` and tests for null, precisely so a missing row (a 404) stays distinguishable from a failed query (a throw). Prefer that over `findUniqueOrThrow`, which collapses the two into one error — that collapse fails the build against an empty database, which is what the CI Cypress job prerenders against.
- **If a partial failure is genuinely tolerable**, split it: a `readX()` that carries `"use cache"` and throws, plus an uncached caller that catches and degrades. `readTypeDogmaMeta` (`app/type/[typeId]/page.tsx`) and `readSolarSystemSdeInfo` (`app/system/[systemId]/page.tsx`) are the reference implementations — commit `e60062ec` established the split (for a cached _empty value_; the cached-404 variant is the same defect class). Never catch on the cached side of that split.
- **Don't add a manual `Sentry.captureException`** to these paths. `apps/web/instrumentation.ts` exports `onRequestError = Sentry.captureRequestError`, so an uncaught render error is already reported; a catch is what makes it invisible.

**The dynamic `[param]` routes are a deliberate exception, not an oversight.** `category/[categoryId]`, `group/[groupId]`, `type/[typeId]`, `dogma/effect/[effectId]`, `lp-store/[corporationId]`, `dogma/attribute/[attributeId]` and `active-wars`/`travel` still reach `notFound()` on a failed query. Because that throw happens inside a `<Suspense>` boundary the response is HTTP **200** with the not-found UI and nothing is stored, so it self-heals per request rather than latching. `app/sitemap.ts` is the other sanctioned exception: it degrades to a partial sitemap deliberately and reports it to Sentry (`sitemap.ts:385`). The cost in both cases is a wrong-but-transient response, not a poisoned cache.

**What "throws instead" actually costs, measured against Next 16.2.11.** Don't reason about this from the self-hosted code path — Vercel does not run it:

| cached read throws during revalidation | result                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------- |
| `next start` (self-hosted)             | serves the previous entry (`200`, `x-nextjs-cache: HIT`), retries ~30s |
| Vercel (`NEXT_PRIVATE_MINIMAL_MODE=1`) | origin returns **`500`**                                               |

Next's serve-the-previous-entry recovery (`server/response-cache/index.js:290-307`) is unreachable in minimal mode, because `:193` reads `previousIncrementalCacheEntry = !this.minimal_mode ? … : null`. On Vercel what shields users is the **CDN** serving the last successful ISR version while revalidation fails — a platform guarantee, not a Next one. So on a genuine cache MISS during an outage (a region with no copy, a purge, or past `expire`) the visitor gets an error page, where the old code gave them a rendered — but wrong, and stored — 404. Still the better trade: an error is transient and uncached, whereas `notFound()` is a _success_ Next stores and serves for the full `cacheLife`. But it is a trade, not a free win — and `apps/web` has no `app/error.tsx`, so that error page is Next's unbranded default.

Diagnosing a suspected instance: check `x-nextjs-prerender` / `x-vercel-cache` / `age` on the response, grep the body for `secret place` (the `not-found.tsx` marker), and confirm against Vercel runtime logs — the poisoning revalidation appears as a `cache=STALE` serverless invocation carrying the `prisma:error`. A `notFound()` thrown inside a `<Suspense>` boundary returns **HTTP 200** with the not-found UI, so status code alone does not tell you whether the read succeeded.

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
  solar-system-map/          # publishable R3F 3D solar-system map (presentational)
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
- **Testing:** Jest 30 (unit). Cypress 15 runs a small smoke suite (`apps/web/cypress/e2e/smoke.cy.ts`) whose assertions are request-level: the homepage does not 5xx, `/about` server-renders, the PWA manifest is served, and an unknown route 404s. It gates "this deploy came up and serves real routes", not feature behaviour — there is still no meaningful E2E coverage.
- **Monitoring:** Sentry + Umami

## Key Conventions

- **Internal imports:** `@jitaspace/<name>` with `workspace:*` version specifiers in `package.json`.
- **Adding a new `@jitaspace/*` package to the web app:** if it ships TypeScript source, add it to `transpilePackages` in `apps/web/next.config.mjs`; server-only/Node-only deps go in `serverExternalPackages` instead (e.g. `bull`).
- **New dependencies** go in the consuming package's `package.json`, not root.
- **ESLint:** flat config only (`eslint.config.ts`); never `.eslintrc.*`. `apps/web` lints with `--flag unstable_native_nodejs_ts_config`.
- **TypeScript:** `moduleResolution: Bundler`, `strict`, `noUncheckedIndexedAccess`; all packages extend `tooling/tsconfig/base.json`.
- **Prettier import order** (via `@ianvs/prettier-plugin-sort-imports`): React/Next → third-party → `@jitaspace/*` types → `@jitaspace/*` values → relative.
- **URL-synced filter state (nuqs):** use `useQueryState`/`useQueryStates` for filter/sort/view state that should be shareable (see `app/mail/page.client.tsx`, `components/Wars/WarRoom/WarList.tsx`). Two rules: (1) the consuming component **must** sit under a `<Suspense>` boundary — nuqs calls `useSearchParams()` internally, and without one the route silently drops out of static prerendering under `cacheComponents`; (2) prefer a validating parser (`parseAsInteger`, `parseAsStringLiteral`) over `parseAsString` so hand-edited URLs can't reach an API. Page-owned params may use bare names (`status`, `sort`); a **shared** component that adopts nuqs must namespace via `urlKeys` to avoid colliding with its host page.
- **Page metadata:** every public page describes itself through `pageMetadata()` (`apps/web/lib/metadata.ts`) rather than a hand-written `export const metadata`. Next merges metadata per key and only re-resolves `openGraph` for a segment that declares one, so a page setting only `title`/`description` inherits the root layout's card (and unfurls on Discord as the generic site blurb), while a page declaring `openGraph` itself replaces the root's wholesale (dropping `siteName`/`type`). The helper states the full block and builds the `og:image` — a card rendered by `app/api/og/route.tsx` via Next's built-in `next/og`. `tests/pageMetadataCoverage.test.ts` enforces the rule; a `"use client"` page carries its metadata in a sibling `layout.tsx`. Its `path` is what emits the canonical URL, so an entity route parses its id with `parsePositiveEntityId` (`lib/routeParams.ts`) and passes the parsed value — never the raw segment, which would canonicalise `/type/0587` as a page of its own.
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

Four GitHub Actions run on pushes to `main` and on pull requests (all set `SKIP_ENV_VALIDATION=1`):

- **`type-check.yml`:** `pnpm install --frozen-lockfile` → `pnpm type-check`. A hard gate — the repo is expected to be **green**, so a type error fails the PR. No explicit codegen step: the turbo `type-check` task depends on the Prisma and Kubb generators, so a clean checkout produces them itself.
- **`lint.yml`:** `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm format:check`. `pnpm lint` also runs `manypkg check`, which fails on a dependency declared at different versions across workspaces.
- **`cypress.yml`:** spins up CockroachDB + Redis → push DB schema → `pnpm build` → start web → run the smoke suite. It gates that the build succeeds, the server boots, and four real routes respond. Recording and `--parallel` are enabled only when `CYPRESS_RECORD_KEY` is present, so fork PRs run the suite unrecorded instead of failing. The job also supplies placeholder `NEXT_PUBLIC_*` values: `SKIP_ENV_VALIDATION` is never inlined into the client bundle, so `env.ts` always validates in the browser and a build without them produces a bundle that throws on load.
- **`sonarcloud.yml`:** `pnpm install --frozen-lockfile` → `pnpm test` (coverage) → SonarQube scan. New code must keep coverage above the quality gate.

`.githooks/pre-commit` also runs `pnpm lint` locally. It is bypassable with `--no-verify`, and it is only installed once the root `prepare` script has run — so a failed `pnpm install` leaves a checkout with no local lint gate. `lint.yml` is the backstop.

Local equivalent before pushing: `pnpm db:generate` → `SKIP_ENV_VALIDATION=1 pnpm build` → `pnpm lint` → `pnpm format:check` → `pnpm type-check` → `pnpm test`.

> After merging `main`, re-run `pnpm db:generate` before trusting a type-check: a schema change plus a stale client makes valid columns look missing and cascades into unrelated errors. If a fresh worktree reports errors inside a `dist/` or `prisma/generated/` path, that is a stale `tsbuildinfo` or an unbuilt package, not repo state — clear `node_modules/.cache` and rebuild.

## Where to look first

| Area              | Path                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------ |
| Turbo pipeline    | `turbo.json`                                                                         |
| Web config / env  | `apps/web/next.config.mjs`, `apps/web/env.ts`                                        |
| Web routes        | `apps/web/app/`                                                                      |
| DB schema         | `packages/db/prisma/schema.prisma`                                                   |
| ESI client gen    | `packages/esi-client/kubb.config.ts`, `packages/esi-client/swagger.json`             |
| Auth              | `packages/auth/index.ts` (SSO flow in `packages/auth/src/oauth/`)                    |
| Shared tooling    | `tooling/eslint/base.ts`, `tooling/prettier/index.mjs`, `tooling/tsconfig/base.json` |
| Test config (web) | `apps/web/jest.config.ts`, `apps/web/cypress.config.ts`                              |
