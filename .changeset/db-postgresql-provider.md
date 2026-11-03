---
"@jitaspace/db": major
---

The schema now targets PostgreSQL instead of CockroachDB: the datasource provider is `postgresql`, and `Incursion`/`IncursionEvent` ids use `autoincrement()` in place of CockroachDB's `sequence()`. Push the schema to a PostgreSQL database; CockroachDB is no longer supported. `createPrismaClient` also takes a new `maxConnections` option, which defaults to 5 (down from `pg`'s 10) so that many serverless instances stay within a pooler's client limit.
