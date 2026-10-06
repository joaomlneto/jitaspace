import * as Sentry from "@sentry/nextjs";
import { initBotId } from "botid/client/core";
import posthog from "posthog-js";

import { env } from "~/env";
import { SENTRY_DENY_URLS, SENTRY_IGNORE_ERRORS } from "~/lib/sentryNoise";

/**
 * Vercel BotID — invisible bot protection for the one expensive server action
 * left in the change history, the build comparison
 * ({@link ~/lib/history-actions}). It is unauthenticated, runs heavy range SQL
 * against the build-history database (plus a day-cached read of the compared
 * entities' names), and `getBuildRangeChanges` mints a `cacheLife("max")` entry
 * that effectively never expires — the app's most attractive target for
 * automated abuse. The matching `checkBotId()` guard lives in
 * `lib/history-actions.ts`.
 *
 * BotID matches on request PATH + METHOD, not on which action is invoked, and
 * Server Actions POST to the *page* they are invoked from. So an entry here
 * intercepts EVERY Server Action fired from a matching page, not just the
 * guarded one — each waits on `getChallenge()` before its POST goes out,
 * including the root layout's EVE token refresh. Hence the narrow path: the
 * comparison runs only on `/history/compare/{from}/{to}`.
 *
 * Every other history page needs no guard: the `/history` index, the build
 * pages and every entity's history are server-rendered from cached reads, with
 * no client-invoked action.
 */
initBotId({
  protect: [{ path: "/history/compare/*", method: "POST" }],
});

Sentry.init({
  enabled: env.NODE_ENV === "production",
  dsn: "https://8ce4a77ec56a1b9fa5c8081b394c3636@o4507086334001152.ingest.de.sentry.io/4507086337540176",

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  // Extensions and injected userscripts throw on our pages; see sentryNoise.ts.
  denyUrls: SENTRY_DENY_URLS,
  ignoreErrors: SENTRY_IGNORE_ERRORS,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

// Initialize PostHog analytics. This MUST live in the app-root
// instrumentation-client file (not app/) — Next.js only executes the root one,
// so posthog.init previously never ran and no client-side events were captured.
// Only initialize when a project token is configured; NEXT_PUBLIC_* vars are
// inlined at build time, so this must be present in the production build env.
if (env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) {
  posthog.init(env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN, {
    api_host: "/ingest",
    ui_host: "https://eu.posthog.com",
    // Newest defaults bundle supported by the pinned posthog-js.
    defaults: "2026-05-30",
    capture_exceptions: true,
    debug: env.NODE_ENV === "development",
  });
}
