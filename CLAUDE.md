# JitaSpace - Claude Code Instructions

## Project Overview

JitaSpace is a Turborepo monorepo for an EVE Online companion web application. It consists of web, CLI, and worker apps plus 15+ shared packages.

## Package Manager

Use **pnpm** exclusively. npm and yarn are blocked via preinstall hook.

```
pnpm install
```

## Key Commands

```bash
pnpm build          # Build all packages/apps
pnpm dev            # Start all dev servers
pnpm test           # Run tests
pnpm lint           # ESLint + manypkg checks
pnpm lint:fix       # Fix linting issues
pnpm type-check     # TypeScript type checking
pnpm format         # Prettier formatting
pnpm db:generate    # Generate Prisma client
pnpm db:push        # Push Prisma schema to DB (also runs db:generate)
pnpm kubb:generate  # Generate API clients from OpenAPI specs
pnpm clean            # Remove root node_modules only
pnpm clean:workspaces # Clean all workspace packages via turbo
```

## Repository Structure

```
apps/
  web/      # Next.js 16 web app (main product, deployed to Vercel)
  cli/      # CLI utilities
  worker/   # Background worker (Vercel-hosted)
packages/
  auth/             # NextAuth with EVE Online SSO
  db/               # Prisma ORM client and schema
  esi-client/       # Generated EVE Online ESI API client
  esi-metadata/     # ESI metadata, scopes, ID ranges
  eve-icons/        # EVE Online icons as React components
  eve-scrape/       # Inngest background jobs for EVE data scraping
  hooks/            # React hooks for ESI interactions
  ui/               # Mantine-based UI component library
  utils/            # Shared utilities
  ...               # Other generated API clients
tooling/
  eslint/           # Shared ESLint presets
  prettier/         # Shared Prettier config
  scripts/          # Shared build/tooling scripts
  tsconfig/         # Shared TypeScript configs
```

## Tech Stack

- **Runtime:** Node.js >=24.5.0
- **Language:** TypeScript 5.8.3
- **Monorepo:** Turborepo 2.5.4
- **Frontend:** Next.js 16, React 19, Mantine 8
- **Data Fetching:** TanStack React Query 5
- **Database:** Prisma 7 + PostgreSQL
- **Auth:** NextAuth 4 with EVE Online OAuth2
- **Background Jobs:** Inngest
- **API Client Generation:** Kubb 3 (generates from OpenAPI specs)
- **Testing:** Jest 30, Cypress 15

## Key Conventions

- All internal packages are imported as `@jitaspace/*` with `workspace:*` version specifier
- Build task depends on `db:generate` and `kubb:generate` — run these first if generated files are missing
- ESLint uses flat config format (`eslint.config.*`)
- Prettier uses `@ianvs/prettier-plugin-sort-imports` for import sorting
- API clients under `packages/*-client/` are auto-generated — do not edit generated files directly

## Environment Variables

Copy `.env.example` to `.env` at the repo root. Required variables include:
- `NEXTAUTH_SECRET`, `EVE_CLIENT_ID`, `EVE_CLIENT_SECRET` — Auth
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection
- `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY` — Background jobs
- `CRON_SECRET` — Cron endpoint protection
