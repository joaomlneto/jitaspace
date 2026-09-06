---
"@jitaspace/db": patch
---

Made the index on `Type.marketGroupId` cover `name`, keying it `(marketGroupId, name)`.

The market sidebar reads every type belonging to a market group and projects `name`. The old index was keyed `(marketGroupId, typeId)`, so `name` was uncovered and CockroachDB abandoned the index entirely, full-scanning `Type@Type_pkey` — 52,859 rows and 18 MiB per execution, the bulk of it item `description` text read and immediately discarded. That single statement was ~12% of all database usage. Covering the projection turns the same read into an index-only scan: 19,675 rows, 1.2 MiB. Verified on CockroachDB v26.2 loaded with the production table's shape.

The predicate is not what mattered: `marketGroupId IN (…2111 ids…)` and `marketGroupId IS NOT NULL` plan identically, and both full-scan while `name` is uncovered.

`([marketGroupId]) STORING (name)` is the idiomatic form and is deliberately not used — Prisma cannot express it, and an index created out of band is dropped by `prisma db push`. The two forms are measurably indistinguishable (same plan, same 1.2 MiB read, 3.00 vs 2.95 MiB of index, identical write cost).

Note this index cannot be installed by `pnpm db:push`: production's `Type` is `schema_locked`, and Prisma emits the swap in a form the server will not auto-unlock. Apply the `CREATE INDEX` / `DROP INDEX` pair directly — see the comment on the index in `schema.prisma`.
