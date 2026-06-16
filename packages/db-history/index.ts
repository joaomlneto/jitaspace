import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "./env";
import { PrismaClient } from "./prisma/generated/client";

// Standalone change-history client (the CockroachDB `history` database), kept
// separate from the app's @jitaspace/db. Construction never connects, so this is
// safe to import at module load (e.g. during `next build`); a missing
// HISTORY_DATABASE_URL only surfaces when a query actually runs.
const globalForHistory = globalThis as { historyDb?: PrismaClient };

// `schema` is honored by the adapter at runtime (the `?schema=` URL param is
// not) — lets the same client target e.g. a `history` schema in another database.
const adapter = new PrismaPg(
  { connectionString: env.HISTORY_DATABASE_URL },
  env.HISTORY_DATABASE_SCHEMA ? { schema: env.HISTORY_DATABASE_SCHEMA } : undefined,
);

export const historyDb =
  globalForHistory.historyDb ?? new PrismaClient({ adapter });

if (env.NODE_ENV !== "production") globalForHistory.historyDb = historyDb;

export * from "./prisma/generated/client";
