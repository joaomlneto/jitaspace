---
"@jitaspace/db": patch
---

`createPrismaClient` now accepts PlanetScale's connection strings as shown in its dashboard. Their trailing `sslrootcert=system` made every query fail with `ENOENT: open 'system'`, because `pg-connection-string` reads the value as a file path. The client now drops it; `sslmode=verify-full` still verifies the certificate against Node's CA store. Also exported as `withoutSystemRootCert`.
