// Validated environment access for @jitaspace/db-history.
//
// Reading `process.env` is permitted in this file: the `restrictEnvAccess`
// ESLint rule exempts `**/env.ts`. Consumers should import `{ env }` from here
// instead of touching `process.env` directly.
export const env = {
  HISTORY_DATABASE_URL: process.env.HISTORY_DATABASE_URL,
  /** Optional Postgres schema holding the history tables (default: public). */
  HISTORY_DATABASE_SCHEMA: process.env.HISTORY_DATABASE_SCHEMA,
  NODE_ENV: process.env.NODE_ENV,
};
