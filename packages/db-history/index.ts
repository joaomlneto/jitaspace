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
const schema = env.HISTORY_DATABASE_SCHEMA;
// An empty value counts as unset.
const adapterOptions = schema ? { schema } : undefined;
const adapter = new PrismaPg(
  { connectionString: env.HISTORY_DATABASE_URL },
  adapterOptions,
);

/**
 * The schema the history tables live in — the one the adapter qualifies every
 * generated query with (`public` when none is configured).
 *
 * The adapter applies it to Prisma's own SQL only; it never sets the
 * connection's `search_path`. Hand-written SQL (`$queryRaw`) must therefore
 * qualify its table names with this, or it fails with `42P01 relation "X" does
 * not exist` whenever the tables are outside `public`, while every other read
 * keeps working.
 */
export const historySchema = adapterOptions?.schema ?? "public";

export const historyDb =
  globalForHistory.historyDb ?? new PrismaClient({ adapter });

if (env.NODE_ENV !== "production") globalForHistory.historyDb = historyDb;

export * from "./prisma/generated/client";
