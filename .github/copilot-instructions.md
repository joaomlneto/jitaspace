# GitHub Copilot Agent Instructions — JitaSpace

## What This Repo Is

Turborepo monorepo for an EVE Online companion web application. Two apps (`apps/web`, `apps/cli`) and 20+ shared packages under `packages/`. The main product is `apps/web`, a Next.js 16 app deployed to Vercel. Background jobs run on Trigger.dev (the `background-jobs-triggerdev` adapter); there is no `apps/worker`.

**Tech stack:** Node.js >=24.15.0 · TypeScript 5.9 · Next.js 16 · React 19 · Mantine 8 · TanStack Query 5 · Prisma 7 + PostgreSQL · EVE Online SSO (OAuth2 + PKCE) · Trigger.dev · Turborepo 2 · pnpm 11.3.0

---

## Package Manager — pnpm Only

**Always use pnpm.** A `preinstall` hook rejects npm and yarn. Never run `npm install` or `yarn`.

```bash
pnpm install                  # Install all workspace dependencies
pnpm install --frozen-lockfile  # CI-safe install (do not alter lockfile)
```

---

## Environment Setup

Copy `.env.example` to `.env` at the repo root before running locally. Required variables: `DATABASE_URL`, `REDIS_URL`, `NEXTAUTH_SECRET`, `EVE_CLIENT_ID`, `EVE_CLIENT_SECRET`.

**For CI, lint, or builds without secrets, always set `SKIP_ENV_VALIDATION=1`** — this bypasses the Zod env validation in `apps/web/next.config.mjs` that would otherwise abort without real credentials.

---

## Pre-Build Requirements (MUST run before `pnpm build`)

Two code-generation steps are prerequisites for the build:

```bash
pnpm db:generate      # Generates Prisma client from packages/db/prisma/schema.prisma
pnpm kubb:generate    # Generates API clients from OpenAPI specs in packages/*-client/
```

Turbo's `build` task declares these as dependencies, but always run them explicitly after a fresh clone or after changing the DB schema or any `swagger.json` / `kubb.config.ts`.

**Never edit generated files directly:**

- `packages/db/` (Prisma client) — edit `packages/db/prisma/schema.prisma`, then run `pnpm db:generate`
- `packages/esi-client/src/generated/**` and other `packages/*-client/src/generated/**` — edit the `swagger.json` or `kubb.config.ts`, then run `pnpm kubb:generate`

---

## Build

```bash
SKIP_ENV_VALIDATION=1 pnpm build   # Build all packages and apps via Turbo
```

`build` outputs to `.next/**` (web) and `dist/**` (packages). The web app sets `typescript.ignoreBuildErrors: true` in CI (`apps/web/next.config.mjs`) so TypeScript errors do not fail the Next.js build in CI, but they still fail `pnpm type-check`.

---

## Validation Commands (run these to confirm changes are correct)

```bash
pnpm lint                          # ESLint (flat config) + manypkg workspace checks
pnpm lint:fix                      # Auto-fix linting issues
pnpm format                        # Prettier (also sorts imports)
pnpm type-check                    # tsc --noEmit across all workspaces
pnpm test                          # Jest unit tests across workspaces (generates coverage)
```

**Run in order for a full local CI check:**

1. `pnpm db:generate`
2. `SKIP_ENV_VALIDATION=1 pnpm build`
3. `pnpm lint`
4. `pnpm type-check`
5. `pnpm test`

---

## Continuous Integration

Two GitHub Actions workflows run on every push:

**Cypress Tests** (`.github/workflows/cypress.yml`):

- Requires CockroachDB (v24.3.7) and Redis services
- Sequence: `pnpm install` → push DB schema (`cd packages/db && pnpm exec prisma db push`) → `pnpm build` → start web server → Cypress E2E (parallel, 2 containers)
- Uses `SKIP_ENV_VALIDATION=1`

**SonarCloud** (`.github/workflows/sonarcloud.yml`):

- Runs on `main` pushes and all PRs
- Sequence: `pnpm install --frozen-lockfile` → `pnpm test` (produces coverage) → SonarQube scan
- Uses `SKIP_ENV_VALIDATION=1` and a dummy `DATABASE_URL` for Prisma codegen in postinstall

---

## Key File Locations

| Purpose                    | Path                                                                     |
| -------------------------- | ------------------------------------------------------------------------ |
| Root scripts & pnpm config | `package.json`, `pnpm-workspace.yaml`, `.npmrc`                          |
| Turbo pipeline config      | `turbo.json`                                                             |
| Web app entry & routes     | `apps/web/app/`                                                          |
| Web app config             | `apps/web/next.config.mjs`, `apps/web/env.ts`                            |
| DB schema                  | `packages/db/prisma/schema.prisma`                                       |
| ESI API client generation  | `packages/esi-client/kubb.config.ts`, `packages/esi-client/swagger.json` |
| Auth config                | `packages/auth/index.ts` (SSO flow in `packages/auth/src/oauth/`)        |
| Shared ESLint rules        | `tooling/eslint/src/base.ts`                                             |
| Shared Prettier config     | `tooling/prettier/index.mjs`                                             |
| Shared TypeScript config   | `tooling/tsconfig/base.json`                                             |
| Jest config (web)          | `apps/web/jest.config.ts`                                                |
| Cypress config (web)       | `apps/web/cypress.config.ts`                                             |

---

## Adding New Local Packages to the Web App

When a new `@jitaspace/*` package exports TypeScript source and needs to be imported by `apps/web`:

1. Add the package to the `transpilePackages` array in `apps/web/next.config.mjs`
2. If the package has server-only dependencies (e.g. Node.js-only modules), add those to `serverExternalPackages` instead

---

## Conventions

- **Internal imports:** Always use `@jitaspace/<package-name>` with `workspace:*` as the version specifier in `package.json`
- **ESLint:** Flat config format (`eslint.config.ts`). Do not use `.eslintrc.*` format.
- **TypeScript:** `moduleResolution: Bundler`, `strict: true`, `noUncheckedIndexedAccess: true`. All packages extend `tooling/tsconfig/base.json`.
- **Prettier + import sorting:** Import order enforced via `@ianvs/prettier-plugin-sort-imports`: React/Next first, then third-party, then `@jitaspace/*` types, then `@jitaspace/*` values, then relative imports.
- **Environment validation:** `apps/web/env.ts` uses Zod. All new server env vars go in the server schema, client vars (prefixed `NEXT_PUBLIC_`) go in the client schema.

---

## Common Pitfalls

- **Missing generated files:** If you see import errors for `@jitaspace/db` or `@jitaspace/esi-client`, run `pnpm db:generate` and/or `pnpm kubb:generate` first.
- **Env validation crash:** Build or dev server crashes with env errors → set `SKIP_ENV_VALIDATION=1`.
- **Wrong package manager:** Any `npm install` or `yarn` command will fail with a preinstall error — use pnpm only.
- **Prisma postinstall:** The `packages/db` package runs `prisma generate` on `postinstall`. CI sets a dummy `DATABASE_URL` so this succeeds without a real database.
- **`apps/web` lint command:** Uses `--flag unstable_native_nodejs_ts_config` for native ESM TypeScript config support.

---

Trust these instructions. Only search the codebase if the information here appears incomplete or incorrect.
