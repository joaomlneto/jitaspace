import "server-only";

// The change-history Prisma client lives in its own workspace package so CI
// generates it (via postinstall) before lint/type-check/build — see
// packages/db-history. Re-exported here as the app-local import surface used by
// the /api/history-db/* route handlers.
export { historyDb } from "@jitaspace/db-history";
