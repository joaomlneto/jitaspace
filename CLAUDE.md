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
pnpm db:push        # push Prisma schema to DB (also runs db:generate)
pnpm kubb:generate  # generate API clients from OpenAPI specs
pnpm cypress:run    # run web E2E tests headlessly
pnpm cypress:open   # open Cypress runner
pnpm clean          # remove all node_modules
pnpm clean:workspaces # clean workspace build output via turbo
```

### Running a single test

Tests live in `apps/web` and run via Jest behind `pnpm with-env` (loads root `.env`). From `apps/web`:

```bash
pnpm test path/to/file.test.ts          # a single file
pnpm test -- -t "test name substring"   # by test name
pnpm test:watch                          # interactive watch
```

## Critical: code generation before build

Two generated artifacts are prerequisites and the Turbo `build`/`type-check` tasks depend on them. After a fresh clone, a schema change, or a `swagger.json`/`kubb.config.ts` change, run them explicitly:

```bash
pnpm db:generate     # Prisma client → packages/db
pnpm kubb:generate   # OpenAPI → TypeScript clients in packages/*-client/src/generated/
```

If you see import errors for `@jitaspace/db` or `@jitaspace/esi-client`, these haven't run yet.

**Never edit generated files directly.** Instead edit the source and regenerate:

- Prisma client → edit `packages/db/prisma/schema.prisma`, then `pnpm db:generate`
- API clients → edit the package's `swagger.json` / `kubb.config.ts`, then `pnpm kubb:generate`

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
  kv/                        # Redis client + Bull job queues
  esi-client/ sde-client/    # Kubb-generated EVE API clients (ESI, self-hosted SDE)
  evekill-client/ evetycoon-client/ fuzzworks-market-client/  # more generated clients
  esi-metadata/ eve-data/    # ESI scopes/ID ranges; static EVE datasets
  hooks/                     # React Query hooks over ESI / third-party APIs
  ui/ eve-icons/ tiptap-eve/ # Mantine component lib; icons; EVE-HTML Tiptap extension
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
- **Frontend:** Next.js 16 (App Router), React 19, Mantine 8, Zustand
- **Data fetching:** TanStack React Query 5
- **DB / cache:** PostgreSQL + Prisma 7; Redis + Bull
- **Auth:** Custom EVE Online SSO OAuth2 flow (authorization code + PKCE)
- **Background jobs:** Trigger.dev — platform-agnostic logic in `@jitaspace/background-jobs`, run by the `background-jobs-triggerdev` adapter
- **API codegen:** Kubb 3 (OpenAPI → TypeScript)
- **Rich text:** Tiptap + EVE HTML extensions
- **Testing:** Jest 30 (unit), Cypress 15 (E2E)
- **Monitoring:** Sentry + Umami

## Key Conventions

- **Internal imports:** `@jitaspace/<name>` with `workspace:*` version specifiers in `package.json`.
- **Adding a new `@jitaspace/*` package to the web app:** if it ships TypeScript source, add it to `transpilePackages` in `apps/web/next.config.mjs`; server-only/Node-only deps go in `serverExternalPackages` instead (e.g. `bull`).
- **New dependencies** go in the consuming package's `package.json`, not root.
- **ESLint:** flat config only (`eslint.config.ts`); never `.eslintrc.*`. `apps/web` lints with `--flag unstable_native_nodejs_ts_config`.
- **TypeScript:** `moduleResolution: Bundler`, `strict`, `noUncheckedIndexedAccess`; all packages extend `tooling/tsconfig/base.json`.
- **Prettier import order** (via `@ianvs/prettier-plugin-sort-imports`): React/Next → third-party → `@jitaspace/*` types → `@jitaspace/*` values → relative.
- **Build note:** `apps/web` sets `typescript.ignoreBuildErrors: true` in CI, so TS errors don't fail the Next build — but they still fail `pnpm type-check`. Always run `pnpm type-check` to validate types.

## Changesets

Non-trivial changes need a changeset in `.changeset/` (skip private packages, i.e. `"private": true`):

```markdown
---
"@jitaspace/package-name": patch | minor | major
---

Description of the change.
```

- patch = bug fix/internal; minor = new feature/export; major = breaking.
- **`@jitaspace/web` changesets must be end-user-readable** ("Fixed mail search not returning results"), not implementation detail. All other packages use developer-facing descriptions.
- If a dependency change produces a visible web-app effect, also add `"@jitaspace/web": patch` with a user-facing note.

## CI

Two GitHub Actions run on push/PR (both set `SKIP_ENV_VALIDATION=1`):

- **`cypress.yml`:** spins up CockroachDB + Redis → push DB schema → `pnpm build` → start web → Cypress E2E (parallel).
- **`sonarcloud.yml`:** `pnpm install --frozen-lockfile` → `pnpm test` (coverage) → SonarQube scan. New code must keep coverage above the quality gate.

Local equivalent before pushing: `pnpm db:generate` → `SKIP_ENV_VALIDATION=1 pnpm build` → `pnpm lint` → `pnpm type-check` → `pnpm test`.

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
