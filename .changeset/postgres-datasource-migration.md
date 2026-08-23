---
"@jitaspace/db": major
"@jitaspace/db-history": patch
---

Switch the Prisma datasource from CockroachDB to PostgreSQL.

`datasource db.provider` is now `postgresql` in both schemas. This is breaking
for any deployment still pointing at CockroachDB: the two providers emit
different DDL for the same models, most importantly `Int`, which was `INT8`
(64-bit) under CockroachDB and is `INTEGER` (32-bit) under PostgreSQL. Every
value this schema stores fits in 32 bits — EVE's documented id ranges top out at
2147483647 (`@jitaspace/esi-metadata`'s `characterIdRanges`), and the genuinely
64-bit columns (killmail ids, ISK amounts, prices, collateral) were already
declared `BigInt` — so no column needed widening, but an existing CockroachDB
database will not match the new schema without a migration.

`@jitaspace/db-history` additionally replaces CockroachDB's
`@default(sequence())` with `@default(autoincrement())` on the five synthetic
primary keys (`BuildDiff`, `FileChange`, `Collection`, `Entity`, `Change`),
which PostgreSQL implements as `SERIAL`.
