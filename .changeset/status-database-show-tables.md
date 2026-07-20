---
"@jitaspace/web": patch
---

Fixed the Database panel on the status page showing "Database status is currently unavailable" — it now reads table row estimates via `SHOW TABLES` instead of restricted internal tables, so the dashboard works again on CockroachDB v26 and CockroachDB Cloud.
