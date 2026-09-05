# @jitaspace/db

Prisma ORM client and database utilities for JitaSpace.

## Overview

Exports an initialized Prisma client connected to the JitaSpace PostgreSQL database via the `pg` adapter. All Prisma-generated model types and enums are re-exported for use across the monorepo.

## Usage

```ts
import { prisma } from "@jitaspace/db";

const characters = await prisma.character.findMany();
```

## Scripts

| Command            | Description                                 |
| ------------------ | ------------------------------------------- |
| `pnpm db:generate` | Generate the Prisma client from schema      |
| `pnpm db:diff`     | Read-only: show what `db:push` would change |
| `pnpm db:diff:sql` | The same diff as SQL rather than a summary  |
| `pnpm db:push`     | Apply schema changes to the database        |
| `pnpm db:studio`   | Open Prisma Studio                          |

`db:push` is the only way the schema is ever applied — nothing does it automatically, and deploys do not. Run `db:diff` first and check which database it reports before pushing.

There is no `prisma/migrations` directory, so the `db:migrate:*` scripts (`dev`, `deploy`, `reset`, `reset-sql`) have nothing to apply. They exist for a future move to Prisma Migrate; ignore them until a baseline migration is created.

## Environment Variables

| Variable       | Description                  |
| -------------- | ---------------------------- |
| `DATABASE_URL` | PostgreSQL connection string |

## Schema

The Prisma schema is located at `prisma/schema.prisma`. Run `pnpm db:generate` after any schema changes, or use `pnpm db:generate:watch` during development.
