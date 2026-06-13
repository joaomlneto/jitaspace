import { prismaExtension } from "@trigger.dev/build/extensions/prisma";
import { defineConfig } from "@trigger.dev/sdk";

/**
 * Trigger.dev project config. The project ref is read from the environment so
 * `tsc`/CI pass without a real project; set `TRIGGER_PROJECT_REF` (or replace
 * the placeholder) before `trigger.dev dev`/`deploy`.
 *
 * Prisma 7 uses the `prisma-client` generator, so the build uses modern mode.
 * Modern mode does NOT run `prisma generate` — it must run before the build.
 * The deploy installs from the repo root and `@jitaspace/db`'s postinstall
 * runs `prisma generate`, so the install step covers it.
 *
 * runtime "node-22" → Node 22.16.0: the repo pins `pnpm@11.3.0`, which needs
 * Node >=22.13, but Trigger's default build runtime is older. node-22 is the
 * newest Trigger offers (no node-24 yet), and it clears the pnpm floor.
 */
export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF ?? "proj_REPLACE_ME",
  dirs: ["./src/trigger"],
  runtime: "node-22",
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
