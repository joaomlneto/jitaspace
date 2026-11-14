---
"@jitaspace/db": minor
---

`createPrismaClient` takes an optional `connectionTimeoutMillis`, passed to the `pg` pool. It bounds how long a query waits for a connection, both for a free slot in a full pool and for a new connection's TLS handshake and login. The default is unchanged: no limit.
