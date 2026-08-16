---
"@jitaspace/db": patch
---

Add `db:diff` / `db:diff:sql` for a read-only preview of what `db:push` would change, and repair `db:migrate:reset-sql`, which still used `--from-schema-datasource` — a flag Prisma 7 removed, so the script could not run at all.

This package no longer assumes anything applies the schema for you — `db:push` is the only mechanism, and it is a deliberate step. Run `pnpm db:diff` to review, then `pnpm db:push` to apply.
