import "dotenv/config";

import { defineConfig } from "prisma/config";

// `prisma generate` runs on postinstall (CI, Vercel, fresh clones) and does not
// need a database URL — but the config is evaluated eagerly, and Prisma's
// `env()` helper throws on a missing variable. Resolve HISTORY_DATABASE_URL
// leniently with a placeholder fallback so install/generate never fails when it
// is unset; real DB operations (db push / studio) still require the real value.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url:
      process.env.HISTORY_DATABASE_URL ??
      "postgresql://placeholder@localhost:26257/history?sslmode=disable",
  },
});
