/* eslint-disable no-restricted-properties --
   Env boundary: Trigger auto-loads this global-init file with no caller to inject
   config, so it reads platform env (NEXT_PUBLIC_SENTRY_DSN, NODE_ENV) directly, like
   trigger.config.ts does. There is no validated `~/env` module in this package. */
import * as Sentry from "@sentry/node";
import { tasks } from "@trigger.dev/sdk";

Sentry.init({
  // Reuses the web app's Sentry project: NEXT_PUBLIC_SENTRY_DSN (and, at build
  // time, SENTRY_ORG / SENTRY_PROJECT / SENTRY_AUTH_TOKEN) are set in Vercel and
  // synced to the Trigger env by the Vercel integration.
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  defaultIntegrations: false,
  // Only report from real (production) deploys, never local `trigger.dev dev`.
  enabled: process.env.NODE_ENV === "production",
  environment: process.env.NODE_ENV ?? "development",
});

// Global hook: capture every task failure (after retries are exhausted) in Sentry.
tasks.onFailure(async ({ payload, error, ctx }) => {
  Sentry.captureException(error, { extra: { payload, ctx } });
  await Sentry.flush(2000);
});
