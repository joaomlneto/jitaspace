import type { Db } from "@jitaspace/db";
import { createPrismaClient } from "@jitaspace/db";

import { env } from "~/env";

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

export const prisma =
  globalForPrisma.__jitaspacePrisma ??
  createPrismaClient({
    connectionString: env.DATABASE_URL,
    logQueries: env.NODE_ENV === "development",
  });

if (env.NODE_ENV !== "production") globalForPrisma.__jitaspacePrisma = prisma;

export * from "@jitaspace/db";
