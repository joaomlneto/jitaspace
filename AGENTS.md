# AGENTS.md — How to be productive with AI agents in this repo

This file is a concise, actionable guide for automated coding agents (or humans) to understand the JitaSpace monorepo quickly and make safe, useful changes.

Big picture

- Monorepo (Turborepo) containing two apps (apps/web, apps/cli) and many internal packages under `packages/` (db, db-history, auth, esi-client, esi-metadata, ui, eve-components, utils, etc. — `ui` is presentational only; the data-aware EVE components live in `eve-components`). Background jobs run on Trigger.dev (the `background-jobs-triggerdev` adapter over the platform-agnostic `background-jobs` package); there is no `apps/worker`. See `CLAUDE.md` for a short overview.
- The web app (`apps/web`) is a Next.js 16 app that imports many local packages via `@jitaspace/*`. Local packages are consumed directly in source (see `apps/web/next.config.mjs` → `transpilePackages`).
- Data layer: Prisma (packages/db) with a large schema at `packages/db/prisma/schema.prisma`. Database client is generated into the package (run `pnpm db:generate`).
- API clients: generated with Kubb from OpenAPI specs (see `packages/esi-client/kubb.config.ts` and `packages/*-client/*/swagger.json`). Generated code lives under each client package (e.g. `packages/esi-client/src/generated`). Do NOT edit generated files.
- Auth: Custom EVE Online SSO OAuth2 flow (authorization code + PKCE) in `packages/auth` (entry: `packages/auth/index.ts`, flow in `packages/auth/src/oauth/`). Token exchange/refresh helpers live in `packages/auth-utils`.

Essential conventions (project-specific)

- Package imports use the internal scope `@jitaspace/*` and `workspace:*` version specifiers in package.json. Respect this when adding new packages.
- pnpm only: root `preinstall` enforces `only-allow pnpm`. Use pnpm (root package.json sets `packageManager: pnpm@...`).
- Generated artifacts are authoritative: `prisma` client, `kubb`-generated API clients. The repo's build depends on these being present.
- **Stale ESLint cache after codegen.** `pnpm lint` runs ESLint with `--cache`, and that cache keys on each linted file's own contents — not on the generated types it imports. So linting _before_ the Prisma/kubb clients exist caches a pile of `no-unsafe-*` / "type that could not be resolved" errors against source files that then never change, and every later lint replays them: your fix is correct and the cache silently disagrees. `db:generate`, `db:push` and `kubb:generate` clear it for you, but `build`/`dev`/`test`/`type-check` also regenerate (via their turbo task deps) and do **not**, nor do the per-package `postinstall` hooks. The turbo `lint` task now declares those codegen edges too, so `pnpm lint` no longer runs ahead of the generators — but a cache written by an older checkout, or by invoking `eslint` directly in a package, still bites. If lint reports errors you cannot reproduce — especially `prisma.*` member accesses — run `pnpm clean:eslint-cache` and re-lint. Use that script rather than the `rm` inside it: its globs abort under zsh (`no matches found`) and delete nothing.
- `apps/web/next.config.mjs` config patterns:
  - `transpilePackages` lists local packages that are imported directly without a build step.
  - `serverExternalPackages` contains server-only packages to avoid bundling into the client (e.g. `bull`).
  - `!process.env.SKIP_ENV_VALIDATION && (await jiti.import("./env"))` — many dev/build steps validate env; set `SKIP_ENV_VALIDATION=1` for CI/docker/lint where appropriate.
- Linting uses a flat ESLint config (`eslint.config.*`) and a shared tooling package under `tooling/eslint`.
- Prettier config uses `@jitaspace/prettier-config` and import-sorting plugin is enabled globally.
- URL-synced filter state uses **nuqs** (`NuqsAdapter` is in `apps/web/app/layout.tsx`; see `app/mail/page.client.tsx` and `components/Wars/WarRoom/WarList.tsx` for the pattern):
  - The component calling `useQueryState`/`useQueryStates` **must** be under a `<Suspense>` boundary. nuqs uses `useSearchParams()` internally, so without one the route silently loses static prerendering under `cacheComponents`. There is no CI check for this — verify with `next build` that the route is still marked `○`.
  - Prefer validating parsers (`parseAsInteger`, `parseAsStringLiteral`) over `parseAsString`; nuqs drops items/values a parser rejects, which keeps hand-edited URLs from reaching an API.
  - Page-owned params can use bare names (`status`, `sort`, `view`); a **shared** component adopting nuqs must namespace its keys via `urlKeys` so it can't collide with the page hosting it.
  - Tests must wrap renders in `withNuqsTestingAdapter` (`nuqs/adapters/testing`) with `{ hasMemory: true }` for interaction tests — without it URL writes don't round-trip and control clicks appear to do nothing.
- Page metadata goes through `pageMetadata()` in `apps/web/lib/metadata.ts` — never hand-roll `export const metadata` on a public page:
  - Next merges metadata per key and only re-resolves `openGraph` for a segment that declares one. A page setting only `title`/`description` silently inherits the root layout's card and unfurls on Discord as the generic site blurb; a page declaring `openGraph` itself replaces the root's wholesale, dropping `siteName` and `type`. `pageMetadata` states the whole block, so neither happens. `tests/pageMetadataCoverage.test.ts` enforces it.
  - It also builds the `og:image`: a card rendered by `app/api/og/route.tsx` (Next's built-in `next/og` — **not** `@vercel/og`, whose native module previously 500'd in production) from query params the page already loaded. `lib/og.ts` owns both sides of that query string, clamps the text, and allow-lists the artwork host.
  - A `"use client"` page can't export metadata; give it a sibling `layout.tsx` that does.
  - `path` is what emits the canonical URL, so pass the value `parsePositiveEntityId` (`lib/routeParams.ts`) returned, never the raw segment — otherwise `/type/0587` canonicalises as a page of its own.
  - Pass artwork via `eveImage.*`, or `resolveTypeImage(typeId)` for a type — the CDN 404s on a variation a type doesn't publish, which leaves an empty frame on the card.

Key developer workflows (commands & examples)

- Install dependencies (use pnpm):

```zsh
pnpm install
```

- Regenerate Prisma client (required before build if schema changed):

```zsh
pnpm db:generate
# Applying the schema to the DB is a separate, manual step — deploys do NOT do it.
pnpm db:diff   # read-only: review what would change
pnpm db:push   # apply it — BEFORE merging the PR that changes the schema
```

> Deploys run `db:generate` only. `db:push` reconciles the database down to the schema on the commit being deployed, so running it from a build makes any PR branched before a schema-adding PR propose **dropping** the newer tables — that broke 18 production deploys in 2026-08. Never pass `--accept-data-loss` to get past it, and note that `db:push` hits whatever `DATABASE_URL` names — in the root `.env` that is production.
>
> Forgetting to push used to be **silent**: under `cacheComponents` a page that catches its own database error prerenders as a 404 with a green build. The nine routes that did this were fixed on 2026-08-30 and now let the read throw, so this class fails loudly — never reintroduce a `catch` around a database read inside a `"use cache"` scope, because `notFound()` is a _successful_ render that Next stores and serves for the whole `cacheLife`. See CLAUDE.md → "Never catch a database error inside a `"use cache"` scope", and "Applying schema changes to the database" for the CockroachDB `schema_locked` recovery.

- Regenerate API clients (Kubb) used by many packages. Example (root):

```zsh
pnpm kubb:generate
# Some packages also run generation on postinstall (see packages/esi-client/package.json scripts)
```

- Run all dev servers (parallel):

```zsh
pnpm dev
# This runs `turbo dev --parallel` and starts the web and cli dev servers
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
# Cypress: apps/web has cypress scripts; root package.json exposes `cypress:run`/`cypress:open` that cd into apps/web.
# NOT feature coverage — apps/web/cypress/e2e/smoke.cy.ts is a four-assertion smoke
# suite (homepage not 5xx, /about server-renders, manifest served, unknown route 404s),
# so CI's Cypress job gates that the build succeeds, the server boots and real routes
# respond. Nothing exercises application behaviour.
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
- Auth: `packages/auth/index.ts`, flow in `packages/auth/src/oauth/`
- Tooling: `tooling/eslint`, `tooling/prettier`, `tooling/tsconfig`

Changesets — documenting changes

- Every non-trivial change must be accompanied by a changeset file in `.changeset/`. Create one with a descriptive filename (e.g. `.changeset/my-feature.md`).
- Format:

  ```markdown
  ---
  "@jitaspace/package-name": patch | minor | major
  ---

  Description of the change.
  ```

- Use **patch** for bug fixes and internal improvements, **minor** for new user-visible features or new exports, **major** for breaking changes.
- **`@jitaspace/web` changesets must be human-readable** — write them as if describing the change to an end user (e.g. "Added dark mode toggle to settings", "Fixed mail search not returning results"). Do not write technical implementation details.
- **All other packages** should use a more technical description aimed at developers (e.g. "Add `renderEveHref` export", "Fix `EveLink` protocol list missing `joinChannel`").
- **If a change in a dependency produces a visible improvement in the web app** (e.g. a bug fix in `tiptap-eve` that changes editor behaviour), also add `"@jitaspace/web": patch` to the same changeset with a human-readable description of what users will notice.
- Do not create changesets for private packages (`"private": true` in their `package.json`).

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
