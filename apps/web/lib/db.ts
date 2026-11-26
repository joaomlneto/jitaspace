import type { Db } from "@jitaspace/db";
import { createPrismaClient } from "@jitaspace/db";

import { env } from "~/env";
import { poolSizeFromEnv } from "./dbPoolSize";

/**
 * App-level Prisma singleton.
 *
 * `@jitaspace/db` reads no environment variables; we build the client here from
 * the web app's validated env. We re-export everything from `@jitaspace/db` so
 * callers can get both the client and the generated types/models from a single
 * module (`import { prisma } from "~/lib/db"`).
 *
 * The instance is cached on `globalThis` (under a shared key) to avoid creating
 * a new client/connection pool on every hot reload in development.
 */
const globalForPrisma = globalThis as { __jitaspacePrisma?: Db };

/** How long a query may wait for a database connection before it fails. */
const DB_CONNECTION_TIMEOUT_MS = 10_000;

export const prisma =
  globalForPrisma.__jitaspacePrisma ??
  createPrismaClient({
    connectionString: env.DATABASE_URL,
    logQueries: env.NODE_ENV === "development",
    maxConnections: poolSizeFromEnv(env.DATABASE_POOL_MAX),
    // Without a limit, a query queued behind a starved pool (or stuck in a TLS
    // handshake on an overloaded instance) waits forever: the request then
    // runs until Vercel's 300 s limit and returns a 504.
    connectionTimeoutMillis: DB_CONNECTION_TIMEOUT_MS,
  });

if (env.NODE_ENV !== "production") globalForPrisma.__jitaspacePrisma = prisma;

export * from "@jitaspace/db";
