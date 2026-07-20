import { sentryEsbuildPlugin } from "@sentry/esbuild-plugin";
import { esbuildPlugin } from "@trigger.dev/build/extensions";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";
import { defineConfig } from "@trigger.dev/sdk";

/**
 * Trigger.dev project config. The project ref is read from the environment so
 * `tsc`/CI pass without a real project; set `TRIGGER_PROJECT_REF` (or replace
 * the placeholder) before `trigger.dev dev`/`deploy`.
 *
 * Prisma 7 uses the `prisma-client` generator, so the build uses modern mode.
 * Modern mode does NOT run `prisma generate` — it must run before the build, so
 * the Trigger.dev project sets a pre-build command `pnpm db:generate` (Console →
 * build settings; documented in this package's README).
 *
 * runtime "node-22" → Node 22.16.0: the repo pins `pnpm@11.3.0`, which needs
 * Node >=22.13, but Trigger's default build runtime is older. node-22 is the
 * newest Trigger offers (no node-24 yet), and it clears the pnpm floor.
 */
export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF ?? "proj_REPLACE_ME",
  dirs: ["./src/trigger"],
  runtime: "node-22",
  // Default machine for every task. Each worker loads the whole task bundle
  // (Prisma + the full ESI/SDE generated clients + Bull) regardless of which
  // task it runs, and that baseline RSS exceeds micro's 0.25 GB — so "micro"
  // OOM-kills even a trivial task (it bit watch-sde). small-1x (0.5 GB, also
  // Trigger's own default) is the proven floor; heavy jobs opt UP per-task
  // (e.g. ingest-sde-all → medium-2x).
  machine: "small-1x",
  // Generous default; long jobs (solar systems, killmail backfill) set their own.
  maxDuration: 600,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 1,
    },
  },
  build: {
    extensions: [
      prismaExtension({ mode: "modern" }),
      // Upload task source maps to Sentry for readable stack traces. Opt-in:
      // only runs when SENTRY_AUTH_TOKEN (write scope) is present in the deploy
      // env — error capture itself (src/trigger/init.ts) needs only the DSN.
      // All three Sentry vars are reused from Vercel (synced to the Trigger env).
      ...(process.env.SENTRY_AUTH_TOKEN
        ? [
            esbuildPlugin(
              sentryEsbuildPlugin({
                org: process.env.SENTRY_ORG,
                project: process.env.SENTRY_PROJECT,
                authToken: process.env.SENTRY_AUTH_TOKEN,
              }),
              { placement: "last", target: "deploy" },
            ),
          ]
        : []),
    ],
  },
});
