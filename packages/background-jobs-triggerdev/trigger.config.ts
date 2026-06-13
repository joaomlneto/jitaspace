import { prismaExtension } from "@trigger.dev/build/extensions/prisma";
import { defineConfig } from "@trigger.dev/sdk";

/**
 * Trigger.dev project config. The project ref is read from the environment so
 * `tsc`/CI pass without a real project; set `TRIGGER_PROJECT_REF` (or replace
 * the placeholder) before `trigger.dev dev`/`deploy`.
 *
 * Prisma 7 uses the `prisma-client` generator, so the build uses modern mode.
 * Modern mode does NOT run `prisma generate` — CI/deploy must run it first
 * (the GitHub Action runs `pnpm db:generate` before deploying).
 */
export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF ?? "proj_REPLACE_ME",
  dirs: ["./src/trigger"],
  runtime: "node",
  // Generous default; long jobs (solar systems, killmail backfill) set their own.
  maxDuration: 600,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 1,
    },
  },
  build: {
    extensions: [prismaExtension({ mode: "modern" })],
  },
});
