# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JitaSpace is a Turborepo + pnpm monorepo for an EVE Online companion web app (mail, assets, market orders, wallet, killmails, rich-text rendering of EVE's HTML, and scheduled background data sync). The main product is `apps/web`, a Next.js 16 app deployed to Vercel and live at [jita.space](https://www.jita.space).

> Two sibling docs cover the same ground for other tools: `AGENTS.md` (concise agent guide with per-area file map) and `.github/copilot-instructions.md` (detailed build/CI guide). Keep this file consistent with them when making changes.

## Package Manager

Use **pnpm exclusively** — the root `preinstall` hook runs `only-allow pnpm`, so `npm install`/`yarn` fail. Pinned to `pnpm@11.3.0`; Node `>=24.15.0` (see `.nvmrc`).

## Key Commands

Scripts are in the root `package.json`. One does more than its name suggests: `pnpm clean:workspaces` (`turbo clean`) runs each workspace's own clean script, and 27 of those delete the workspace's `node_modules` as well as its build output — so it uninstalls dependencies too. Re-run `pnpm install` afterwards.

### Running a single test

Jest suites live in 21 workspaces — `apps/web` plus most `packages/*` (`hooks`, `ui`, `eve-components`, `eve-icons`, `background-jobs`, `auth`, `auth-utils`, `utils`, `tiptap-eve`, `eve-resources`, …). `apps/web` runs Jest behind `pnpm with-env` (loads root `.env`); packages run Jest directly. From the workspace that owns the test:

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

**Both commands hit whatever `DATABASE_URL` points at, and the root `.env` points at the production database** (PlanetScale Postgres; see **Production database** below). Check the datasource line each one prints before you let a push proceed, and run them against the direct URL on port 5432, not PgBouncer's 6432. `db:diff` is `prisma migrate diff --from-config-datasource --to-schema` — read-only, never writes; add `pnpm --filter @jitaspace/db db:diff:sql` for SQL rather than the summary. There is no `prisma/migrations` directory (`packages/db/prisma.config.ts` declares a path for one, but it has never existed), so `db push` is the only mechanism — and Prisma's own docs recommend against it in production. Treat every push as a manual, reviewed operation.

**Push as the role that owns the tables.** Every table in `public`, and the schema itself, belongs to the role that ran the PlanetScale migration (`pscale_api_egbgqam3o4if`). Other roles can read and write rows but not change the schema, so a push from one of them stops at `ERROR: must be owner of table …`. Granting the owner role to another role is not a way round it: on Postgres 18 that needs the `ADMIN` option on the owner role, which no role holds — not even PlanetScale's `postgres`, which has `CREATEROLE` but is not a superuser. Run the two commands with the owner's direct URL set for that command only; `dotenv -e` never overrides a variable already in the environment, so the root `.env` stays as it is:

```bash
DATABASE_URL='postgresql://<owner role>.<branch>:<password>@<host>:5432/postgres?sslmode=verify-full' pnpm db:diff
```

**Why the deploy no longer pushes.** It used to, and it broke 18 production deploys between 2026-08-05 and 2026-08-09. `db push` reconciles the database to _whatever `schema.prisma` sits on the commit being deployed_, so a PR branched **before** a schema-adding PR proposes **dropping** the newer tables. PR #691 — a type-check fix that never touched the schema — proposed dropping 33 populated tables (38,823 rows). Prisma refused and the build went red; the red build was the safety net. The failure mode to recognise if you ever see it again:

- **`Use the --accept-data-loss flag …`** — `schema.prisma` on this commit is _behind_ the database. Rebase onto the commit that added the missing models. **Never add that flag to a build or run it unattended** — it drops the listed tables with no migration history to recover from. Dropping something on purpose is the one legitimate use, and it belongs in a deliberate expand/contract sequence: add the new shape and push, ship code that stops using the old one, then remove it from the schema and push again in a reviewed window. Never drop a column the currently-deployed code still selects.

**Renaming a column: rename it by hand, then push.** `db push` cannot express a rename: it proposes dropping the column, adding an empty `NOT NULL` one and rebuilding the primary key if the column is in it, and it stops at the data-loss prompt. Run `ALTER TABLE "X" RENAME COLUMN "old" TO "new";` in the reviewed window instead. It keeps every row, the primary key follows the column, and `db:diff` then reports no difference. Code still selecting the old name fails from that moment until its deploy lands, so check which deployed web and Trigger.dev code reads the table first.

**Push before you merge — the consequence of forgetting used to be quiet, and is now loud.** `cacheComponents` resolves every argument-free `"use cache"` read during the build prerender, so a schema change that lands on `main` unapplied hits those reads with a database error. What happens next depends on where the `catch` sits relative to the cache boundary:

- **`catch` inside the same function as `"use cache"` → silent.** The catch runs normally, `notFound()` wins, and the route is **prerendered as a 404 with a green build**. Nine routes had this shape (`regions`, `categories`, `agents`, `skills`, `ship-scanner`, `dogma/attributes`, `dogma/effects`, `lp-store`, `lp-store/all`). **All nine were fixed on 2026-08-30**, so no route in `apps/web` has it today — the shape is described here only so you can recognise and reject it. See **Never catch a database error inside a `"use cache"` scope** below.
- **`catch` outside the cache scope → loud.** Where `"use cache"` sits in a `data.ts` helper and the page catches around the call, the throw is not contained and the export dies. Only `active-wars` and `travel` are this shape; verified by building against an unreachable database, which exits on `app/active-wars/data.ts:153` despite the guard at `page.tsx:16-20`.
- **Tables no route reads → no signal at all.** The incident's own `NpcCorporation*` tables are written only by `packages/background-jobs`; that drift class gives a green build, a green site, and a Trigger.dev job failing where nobody is looking.

Reads behind `connection()` (e.g. `app/history/page.tsx:24`) or behind `await params` inside a `<Suspense>` boundary are request-time and unaffected either way.

## Production database

The main database is **PostgreSQL on PlanetScale**: a single-node PS-20 (¼ vCPU, 2 GiB RAM, no replicas) in AWS eu-west-1, next to the Vercel functions and ESI. It moved off CockroachDB Cloud in 2026-10, because CockroachDB Basic billed every write and the ingest jobs had grown write-heavy. The build-history database (`EVE_BUILDS_DATABASE_URL`, `@jitaspace/db-builds`) is a separate one and is still CockroachDB.

- **Two URLs, two jobs.** The deployed apps (web, icon server, Trigger.dev) connect through PlanetScale's built-in **PgBouncer on port 6432**, which runs in transaction mode. Schema tooling (`db:push`, `db:diff`) and bulk copies use the **direct port 5432**. Leave `sslrootcert=system` out of either URL: `pg-connection-string` treats `system` as a file path and every query fails.
- **Connections are scarce.** The server allows 25 connections, and PlanetScale keeps some of them. PgBouncer admits 100 clients and shares about 20 server connections between them, and `createPrismaClient` caps each instance's pool at 5. Do not raise that cap or connect apps directly on 5432 without thinking about the total.
- **Transaction pooling has limits.** Through PgBouncer you cannot rely on session state: no session-level `SET`, advisory locks, `LISTEN`/`NOTIFY` or temporary tables across statements. Nothing uses them today.
- **CPU, not RAM, is the first limit.** The whole database (~1.5 GB after the 2026-10 migration) nearly fits in memory, and the cache hit ratio is above 99%. Heavy ingest jobs compete with page traffic for the ¼ vCPU. Move to PS-40 if the hit ratio drops below ~99% or CPU stays saturated.
- **Bulk writes: one statement, not many concurrent ones.** PostgreSQL takes a `FOR KEY SHARE` lock on the referenced row, so concurrent single-row updates on mutually-referencing rows (stargate pairs) deadlock with `40P01`. Write such links in a single `UPDATE … FROM (VALUES …)`, as `ingestSdeStargates` and `scrapeEsiStargates` do.

## Never catch a database error inside a `"use cache"` scope

In `apps/web`, a `catch` that swallows a database failure inside a cached scope turns a blip into a cached 404 that is served for up to 30 days, and nothing reports it. **Let the read throw.** The full rule, its sanctioned exceptions, and how to diagnose an instance are in `apps/web/CLAUDE.md`.

## Environment variables & `SKIP_ENV_VALIDATION`

Copy `.env.example` to `.env` at the repo root. `apps/web/env.ts` validates env vars with Zod (server schema, plus `NEXT_PUBLIC_`-prefixed client schema) and `next.config.mjs` imports it unless `SKIP_ENV_VALIDATION` is set.

**For CI, lint, builds, or any environment without real secrets, set `SKIP_ENV_VALIDATION=1`** or the build/dev server aborts with env errors. Required vars for a real run include `DATABASE_URL`, `REDIS_URL`, `NEXTAUTH_SECRET`, `EVE_CLIENT_ID`, `EVE_CLIENT_SECRET` (full list in `.env.example` / `turbo.json` `globalEnv`).

## Repository Structure

Workspaces are `apps/*`, `packages/*` and `tooling/*`; each `package.json` describes its package. What the layout does not tell you:

- `packages/ui` is presentational and dependency-light: no hooks, no data fetching. Data-aware components go in `packages/eve-components`. Neither knows the web app's routes: anything that links to a page (entity anchors such as `TypeAnchor`, breadcrumbs, entity cards) lives in `apps/web/components` and links through `HoverPrefetchLink` (`apps/web/components/Link`), which prefetches on hover, touch or focus rather than on sight.
- `tooling/eslint`, `tooling/prettier` and `tooling/tsconfig` are shared presets: extend them, don't redefine them.
- There is no `apps/worker`. Background jobs run on Trigger.dev: the logic lives in `@jitaspace/background-jobs`, and the `@jitaspace/background-jobs-triggerdev` adapter runs it.
- `packages/eve-icons` **commits CCP artwork** (`assets/*.png`, copied from the live client) and is publishable. Its LICENSE splits the terms: the code is MIT, the art is © CCP hf. / Fenris Creations and is not. Refresh the art with `pnpm --filter @jitaspace/eve-icons icons:sync` and review the diff: an icon CCP renames or removes is a breaking change for importers. The components in `src/generated/` are built from the PNGs by its `kubb:generate` script, which only reuses that task name. `apps/eve-icons-gallery` is a static site for browsing them (not deployed anywhere yet).
- `apps/icon-server` is a separate Nitro service (its own Vercel project, `icons.jita.space`), not part of the web app. It resolves icon/type IDs through `@jitaspace/db` and fetches the images from CCP's CDN via `@jitaspace/eve-resources`. `@jitaspace/ui`'s `EveIconAvatar` points at it.

## Tech Stack

Versions are in the manifests. Two notes they do not carry:

- **Kubb:** keep `@kubb/*` at `>=4.38.0` — 4.37.x had codegen bugs (object-array collapse, `#`-prefixed keys).
- **Testing:** Jest 30 (unit). Cypress 15 runs a small smoke suite (`apps/web/cypress/e2e/smoke.cy.ts`) whose assertions are request-level: the homepage does not 5xx, `/about` server-renders, the PWA manifest is served, and an unknown route 404s. It gates "this deploy came up and serves real routes", not feature behaviour — there is still no meaningful E2E coverage.

## Key Conventions

- **Internal imports:** `@jitaspace/<name>` with `workspace:*` version specifiers in `package.json`.
- **Adding a new `@jitaspace/*` package to the web app:** if it ships TypeScript source, add it to `transpilePackages` in `apps/web/next.config.mjs`; server-only/Node-only deps go in `serverExternalPackages` instead (e.g. `bull`).
- **New dependencies** go in the consuming package's `package.json`, not root.
- **ESLint:** flat config only (`eslint.config.ts`); never `.eslintrc.*`. `apps/web` lints with `--flag unstable_native_nodejs_ts_config`.
- **TypeScript:** `moduleResolution: Bundler`, `strict`, `noUncheckedIndexedAccess`; all packages extend `tooling/tsconfig/base.json`.
- **Prettier import order** (via `@ianvs/prettier-plugin-sort-imports`): React/Next → third-party → `@jitaspace/*` types → `@jitaspace/*` values → relative.
- **Build note:** `apps/web` sets `typescript.ignoreBuildErrors: true` in CI, so TS errors don't fail the Next build — but they still fail `pnpm type-check`. Always run `pnpm type-check` to validate types.

Conventions specific to the web app (nuqs, ISR, SDE caching, data tables, page metadata, ship tree, `@jitaspace/db-builds`) live in `apps/web/CLAUDE.md`, which loads when you work under `apps/web`.

## Changesets

```markdown
---
"@jitaspace/package-name": patch | minor | major
---

Description of the change.
```

patch = bug fix/internal; minor = new feature/export; major = breaking.

**When a changeset is required:**

- **Publishable packages — always.** Only seven workspaces are publishable (`auth-utils`, `db`, `esi-metadata`, `eve-icons`, `eve-resources`, `solar-system-map`, `tiptap-eve`); every other workspace is `"private": true`. A change to one of these needs a changeset with a developer-facing description.
- **`@jitaspace/web` — always for user-visible changes.** `web` is private and never published, but its changesets are the release-notes queue — the large majority of pending changesets are `web` — so they **must be end-user-readable** ("Fixed mail search not returning results"), not implementation detail. If a change elsewhere produces a visible web-app effect, add `"@jitaspace/web": patch` with a user-facing note.
- **Other private packages — optional.** Internal-only fixes routinely ship without one (e.g. PRs #651 and #652 in `background-jobs`). Add one when the change is worth recording for other developers. The changeset-bot's "No Changeset found" warning on such a PR is expected and can be ignored.

> Note: there is no release workflow — `changeset version`/`publish` are never run in CI, so changesets accumulate as a changelog rather than driving version bumps.

## CI

Four GitHub Actions run on pushes to `main` and on pull requests (all set `SKIP_ENV_VALIDATION=1`):

- **`type-check.yml`:** `pnpm install --frozen-lockfile` → `pnpm type-check`. A hard gate — the repo is expected to be **green**, so a type error fails the PR. No explicit codegen step: the turbo `type-check` task depends on the Prisma and Kubb generators, so a clean checkout produces them itself.
- **`lint.yml`:** `pnpm install --frozen-lockfile` → `pnpm peers check` → `pnpm lint` → `pnpm format:check`. `pnpm lint` also runs `manypkg check`, which fails on a dependency declared at different versions across workspaces. `pnpm peers check` is the only peer-dependency gate. `strictPeerDependencies` is `true`, but a frozen install never resolves, and `pnpm add`/`pnpm update` write a lockfile with unmet peers after only a warning. Every `@mantine/*` package peers on `@mantine/core`/`@mantine/hooks` at exactly its own version, so keep all `@mantine/*` specifiers on one caret floor and bump them together — updating one alone is what this step catches.
- **`cypress.yml`:** spins up PostgreSQL 18 + Redis (plus CockroachDB, only for the build-history database) → push DB schema, and create an empty build-history database from `@jitaspace/db-builds`' schema (`/history` is prerendered from it) → `pnpm build` → start web → run the smoke suite. It gates that the build succeeds, the server boots, and four real routes respond. Recording and `--parallel` are enabled only when `CYPRESS_RECORD_KEY` is present, so fork PRs run the suite unrecorded instead of failing. The job also supplies placeholder `NEXT_PUBLIC_*` values: `SKIP_ENV_VALIDATION` is never inlined into the client bundle, so `env.ts` always validates in the browser and a build without them produces a bundle that throws on load.
- **`sonarcloud.yml`:** `pnpm install --frozen-lockfile` → `pnpm test` (coverage) → SonarQube scan. New code must keep coverage above the quality gate.

`.githooks/pre-commit` also runs `pnpm lint` locally. It is bypassable with `--no-verify`, and it is only installed once the root `prepare` script has run — so a failed `pnpm install` leaves a checkout with no local lint gate. `lint.yml` is the backstop.

Local equivalent before pushing: `pnpm db:generate` → `SKIP_ENV_VALIDATION=1 pnpm build` → `pnpm peers check` → `pnpm lint` → `pnpm format:check` → `pnpm type-check` → `pnpm test`.

> After merging `main`, re-run `pnpm db:generate` before trusting a type-check: a schema change plus a stale client makes valid columns look missing and cascades into unrelated errors. If a fresh worktree reports errors inside a `dist/` or `prisma/generated/` path, that is a stale `tsbuildinfo` or an unbuilt package, not repo state — clear `node_modules/.cache` and rebuild.
