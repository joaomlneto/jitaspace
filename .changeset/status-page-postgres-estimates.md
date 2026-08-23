---
"@jitaspace/web": patch
---

The status page's Database panel now reads its record-count estimates from
PostgreSQL instead of CockroachDB, after the move to a PostgreSQL database. The
numbers it shows are unchanged — still estimates rather than exact counts, still
cached for a few minutes — and the panel's caption now says PostgreSQL.
