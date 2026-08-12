import * as Sentry from "@sentry/nextjs";
import { initBotId } from "botid/client/core";
import posthog from "posthog-js";

import { env } from "~/env";

/**
 * Vercel BotID — invisible bot protection for the expensive `/history` server
 * actions ({@link ~/lib/history-actions}). They are unauthenticated, run heavy
 * range SQL against the build-history database, and `getBuildRangeChanges`
 * mints a `cacheLife("max")` entry that effectively never expires — the app's
 * most attractive target for automated abuse. The matching `checkBotId()`
 * guards live in `lib/history-actions.ts`.
 *
 * BotID matches on request PATH + METHOD, not on which action is invoked, and
 * Server Actions POST to the *page* they are invoked from. So an entry here
 * intercepts EVERY Server Action fired from a matching page, not just the
 * guarded ones — each one waits on `getChallenge()` before its POST goes out.
 * Keep this list as narrow as the guarded actions allow.
 *
 * That is why `/type/*` is deliberately NOT listed even though the type page
 * embeds <EntityHistory>: it is the busiest route family in the app, and the
 * root layout mounts <EsiClientSSOAccessTokenInjector>, whose EVE token-refresh
 * action would otherwise be gated behind a challenge fetch on every type page.
 * The reader that <EntityHistory> calls, `getEntityTimeline`, is consequently
 * left unguarded — it is the cheapest of the six and only `cacheLife("days")`,
 * so it expires on its own rather than accumulating.
 *
 * Residual, accepted: Server Actions invoked from `/history/*` pages (including
 * that same token refresh) still wait on a challenge. Those are low-traffic
 * pages. The way to remove this class of coupling entirely is to move the
 * readers behind `/api/history/*` route handlers and protect those paths, so
 * BotID intercepts only the reader fetches.
 *
 * The `/history` index needs no entry: it is server-rendered via
 * `getCachedHistoryIndex`, not a client-invoked action.
 */
initBotId({
  protect: [{ path: "/history/*", method: "POST" }],
});

Sentry.init({
  enabled: env.NODE_ENV === "production",
  dsn: "https://8ce4a77ec56a1b9fa5c8081b394c3636@o4507086334001152.ingest.de.sentry.io/4507086337540176",

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

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
