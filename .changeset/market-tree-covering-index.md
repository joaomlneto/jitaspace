---
"@jitaspace/db": patch
"@jitaspace/web": patch
---

Made the market sidebar's data load dramatically cheaper on the database.

Building the market tree read every type that belongs to a market group. Because the index on `Type.marketGroupId` did not contain `name`, and the query asked for `name`, CockroachDB gave up on the index and full-scanned the whole `Type` table — 52,859 rows and 18 MiB per execution, the bulk of it item `description` text that was read and immediately discarded. The index is now keyed on `(marketGroupId, name)` so the same read is served as an index-only scan.

The two nested relation loads were also replaced with flat queries. Prisma resolved each nested relation as its own `WHERE <fk> IN (…all 2,109 market group ids…)` statement, and an `IN` list that large is exactly what pushed the planner onto a full scan; filtering on `IS NOT NULL` gives it a single index span instead. The market group `children` round trip is gone entirely — the parent/child edges were already available from `parentMarketGroupId`.
