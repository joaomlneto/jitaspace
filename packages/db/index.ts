import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "./prisma/generated/client";

export interface CreatePrismaClientOptions {
  /** PostgreSQL/CockroachDB connection string. */
  connectionString: string;
  /** Log every query (handy in development). Defaults to `false`. */
  logQueries?: boolean;
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
}: CreatePrismaClientOptions) {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: logQueries ? ["query", "info", "error", "warn"] : ["error"],
  });
}

export type Db = ReturnType<typeof createPrismaClient>;

export * from "./prisma/generated/client";
