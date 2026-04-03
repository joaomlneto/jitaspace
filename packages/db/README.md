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

| Command | Description |
|---|---|
| `pnpm db:generate` | Generate the Prisma client from schema |
| `pnpm db:push` | Push schema changes to the database |
| `pnpm db:migrate:dev` | Create and apply a new migration |
| `pnpm db:migrate:deploy` | Apply pending migrations in production |
| `pnpm db:migrate:reset` | Reset the database and re-apply all migrations |
| `pnpm db:studio` | Open Prisma Studio |

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |

## Schema

The Prisma schema is located at `prisma/schema.prisma`. Run `pnpm db:generate` after any schema changes, or use `pnpm db:generate:watch` during development.
