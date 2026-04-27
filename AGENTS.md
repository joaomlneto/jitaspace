# AGENTS.md — How to be productive with AI agents in this repo

This file is a concise, actionable guide for automated coding agents (or humans) to understand the JitaSpace monorepo quickly and make safe, useful changes.

Big picture
- Monorepo (Turborepo) containing three apps (apps/web, apps/cli, apps/worker) and many internal packages under `packages/` (db, auth, esi-client, esi-metadata, ui, utils, etc.). See `CLAUDE.md` for a short overview.
- The web app (`apps/web`) is a Next.js 16 app that imports many local packages via `@jitaspace/*`. Local packages are consumed directly in source (see `apps/web/next.config.mjs` → `transpilePackages`).
- Data layer: Prisma (packages/db) with a large schema at `packages/db/prisma/schema.prisma`. Database client is generated into the package (run `pnpm db:generate`).
- API clients: generated with Kubb from OpenAPI specs (see `packages/esi-client/kubb.config.ts` and `packages/*-client/*/swagger.json`). Generated code lives under each client package (e.g. `packages/esi-client/src/generated`). Do NOT edit generated files.
- Auth: NextAuth-based SSO in `packages/auth` (key file: `packages/auth/src/auth-options.ts`). Refresh token handling uses helper utilities in `packages/auth-utils`.

Essential conventions (project-specific)
- Package imports use the internal scope `@jitaspace/*` and `workspace:*` version specifiers in package.json. Respect this when adding new packages.
- pnpm only: root `preinstall` enforces `only-allow pnpm`. Use pnpm (root package.json sets `packageManager: pnpm@...`).
- Generated artifacts are authoritative: `prisma` client, `kubb`-generated API clients. The repo's build depends on these being present.
- `apps/web/next.config.mjs` config patterns:
  - `transpilePackages` lists local packages that are imported directly without a build step.
  - `serverExternalPackages` contains server-only packages to avoid bundling into the client (e.g. `bull`).
  - `!process.env.SKIP_ENV_VALIDATION && (await jiti.import("./env"))` — many dev/build steps validate env; set `SKIP_ENV_VALIDATION=1` for CI/docker/lint where appropriate.
- Linting uses a flat ESLint config (`eslint.config.*`) and a shared tooling package under `tooling/eslint`.
- Prettier config uses `@jitaspace/prettier-config` and import-sorting plugin is enabled globally.

Key developer workflows (commands & examples)
- Install dependencies (use pnpm):
```zsh
pnpm install
```
- Regenerate Prisma client (required before build if schema changed):
```zsh
pnpm db:generate
# or if you need to push schema to DB and generate
pnpm db:push
```
- Regenerate API clients (Kubb) used by many packages. Example (root):
```zsh
pnpm kubb:generate
# Some packages also run generation on postinstall (see packages/esi-client/package.json scripts)
```
- Run all dev servers (parallel):
```zsh
pnpm dev
# This runs `turbo dev --parallel` and starts web/cli/worker
```
- Build / CI:
```zsh
pnpm build
# Ensure db:generate and kubb:generate have run (build depends on them)
```
- Tests:
```zsh
pnpm test           # turbo test across workspaces
pnpm test:watch     # watch mode
# E2E: apps/web has cypress scripts; root package.json exposes helpers `cypress:run`/`cypress:open` that cd into apps/web
```
- Lint & format:
```zsh
pnpm lint
pnpm lint:fix
pnpm format
```

Integration points & gotchas
- Kubb generation: some specs are pre-processed before feeding into kubb (see `packages/esi-client/package.json` → `download-schema` and `kubb:generate`). Look at `packages/esi-client/kubb.config.ts` for overrides (e.g. infinite-scroll paths) and the `get-esi-date` build script.
- Prisma codegen: `packages/db/prisma/schema.prisma` is large and authoritative. Running `pnpm db:generate` writes the client into the package. CI must run this before builds/tests that import `@jitaspace/db`.
- Next.js local packages: `transpilePackages` is how Next allows importing packages without publishing a compiled build. When adding a new `@jitaspace/*` package used by `apps/web`, add it to `transpilePackages` if it exports source TypeScript.
- Environment validation: `apps/web/next.config.mjs` imports `./env` unless `SKIP_ENV_VALIDATION` is set. For automated agents running builds or linters in environments without secrets, set `SKIP_ENV_VALIDATION=1`.
- Do not edit generated clients under `packages/*-client/src/generated` or the `packages/*-client/swagger.json` sources without understanding kubb generation.

Where to look first (quick file map for agents)
- Root: `package.json` (scripts, pnpm enforcement), `CLAUDE.md` (project overview)
- Web app: `apps/web/next.config.mjs`, `apps/web/env.ts`, `apps/web/package.json`, `apps/web/README.md`
- DB: `packages/db/prisma/schema.prisma`, `packages/db/package.json`
- ESI client generation: `packages/esi-client/kubb.config.ts`, `packages/esi-client/package.json`, `packages/esi-client/swagger.json`
- Auth: `packages/auth/src/auth-options.ts`, `packages/auth/index.ts`
- Tooling: `tooling/eslint`, `tooling/prettier`, `tooling/tsconfig`

Safety and change rules for automated agents
- Never change generated files directly. Instead edit the source (Prisma schema, OpenAPI swagger, kubb config, or generator config) and run the appropriate `db:generate`/`kubb:generate` task.
- When adding new dependencies, prefer adding them to the appropriate package's package.json (not root) and use workspace specifiers for internal packages (`workspace:*`).
- Respect env-sensitive code paths (SKIP_ENV_VALIDATION) and avoid committing secrets. Use `.env.example` as the template for required variables.

If you need more context
- Start with `CLAUDE.md` (root) and the package README for the target area (most packages have `README.md`).
- For generation issues, inspect `packages/esi-client/package.json` and `packages/esi-client/kubb.config.ts` and any package-level postinstall hooks.

Owners / touchpoints
- Generated API clients: `packages/*-client` maintainers (see respective `package.json` and the `kubb.config.ts` files)
- DB schema: `packages/db/prisma/schema.prisma`
- Web runtime and package composition: `apps/web/next.config.mjs`

This file is intentionally short and references concrete files to help an agent find authoritative information quickly. For a broader human-oriented overview, read `CLAUDE.md` and the per-package READMEs.

