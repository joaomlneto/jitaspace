import type { Db } from "@jitaspace/db";
import { createPrismaClient } from "@jitaspace/db";

/**
 * The service's Prisma client, created on first use.
 *
 * `@jitaspace/db` reads no environment variables, so the connection string is
 * injected here. Creation is deferred so the server still boots (and serves
 * its 503s, see `lib/sde.ts`) when `DATABASE_URL` is missing.
 */
let client: Db | undefined;

export function getPrisma(): Db {
  client ??= createPrismaClient({
    connectionString: process.env.DATABASE_URL ?? "",
  });
  return client;
}
