import type { Db } from "@jitaspace/db";
import { createPrismaClient } from "@jitaspace/db";

import { env } from "./env";

/**
 * Per-package Prisma singleton.
 *
 * `@jitaspace/db` reads no environment variables; we build the client here from
 * this package's validated env. We re-export everything from `@jitaspace/db` so
 * callers can get both the client and the generated types/models from a single
 * module (`import { prisma, Prisma } from "../../../db"`).
 *
 * The instance is cached on `globalThis` under a shared key so that, in a single
 * process (e.g. local dev, where this package runs inside the Next.js app), this
 * package and the web app reuse one client/connection pool instead of opening two.
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
