import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "./prisma/generated/client";

export interface CreatePrismaClientOptions {
  /** PostgreSQL connection string. */
  connectionString: string;
  /** Log every query (handy in development). Defaults to `false`. */
  logQueries?: boolean;
  /**
   * Most connections this client's pool opens. Defaults to 5, not `pg`'s 10:
   * every serverless instance gets its own pool, and production connects
   * through PlanetScale's PgBouncer, which admits 100 clients in total.
   */
  maxConnections?: number;
}

/**
 * Create a {@link PrismaClient}.
 *
 * This package intentionally reads no environment variables: callers (apps)
 * inject the connection string and options from their own validated env. See
 * `apps/web/lib/db.ts` and `packages/eve-scrape/db.ts` for the per-consumer
 * singletons.
 */
export function createPrismaClient({
  connectionString,
  logQueries = false,
  maxConnections = 5,
}: CreatePrismaClientOptions) {
  const adapter = new PrismaPg({
    connectionString: withoutSystemRootCert(connectionString),
    max: maxConnections,
  });
  return new PrismaClient({
    adapter,
    log: logQueries ? ["query", "info", "error", "warn"] : ["error"],
  });
}

/**
 * Drops `sslrootcert=system` from a connection string.
 *
 * PlanetScale's connection strings end in it, meaning "verify against the
 * system CA store" (a libpq 16+ convention). `pg-connection-string` has no case
 * for it and reads `system` as a file path, so every query fails with
 * `ENOENT: open 'system'`. Without the parameter, `sslmode=verify-full` still
 * verifies the server certificate against Node's bundled CA store, which is
 * what the parameter asks for.
 */
export function withoutSystemRootCert(connectionString: string): string {
  return connectionString
    .replace(/([?&])sslrootcert=system(&|$)/, (_, sep: string, next: string) =>
      next ? sep : "",
    )
    .replace(/\?$/, "");
}

export type Db = ReturnType<typeof createPrismaClient>;

export * from "./prisma/generated/client";
