import * as Sentry from "@sentry/nextjs";
import { initBotId } from "botid/client/core";
import posthog from "posthog-js";

import { env } from "~/env";

/**
 * Vercel BotID — invisible bot protection for the `/history` server actions.
 *
 * Those actions ({@link ~/lib/history-actions}) are unauthenticated and each
 * call can run heavy range SQL against the build-history database and mint a
 * permanent `"use cache"` entry, so they are the app's most attractive target
 * for automated abuse. The corresponding `checkBotId()` guards live in
 * `lib/history-actions.ts`.
 *
 * Server Actions POST to the *page* they are invoked from, so the paths below
 * are page routes, not action names. This list MUST cover every page that
 * invokes a guarded action: BotID only attaches its headers to requests
 * matching these entries, and `checkBotId()` fails closed (reports a bot) when
 * the headers are absent. Current invocation sites:
 *   - `/history/build/*`, `/history/compare/*` and the entity pages under
 *     `/history/*` (EntityHistory, _resource-sections, compare page.client)
 *   - `/type/*` — the type page embeds <EntityHistory> in its History tab
 * The `/history` index is server-rendered via `getCachedHistoryIndex`, not a
 * client-invoked action, so it needs no entry.
 */
initBotId({
  protect: [
    { path: "/history/*", method: "POST" },
    { path: "/type/*", method: "POST" },
  ],
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
