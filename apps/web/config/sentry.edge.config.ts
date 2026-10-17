// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  enabled: process.env.NODE_ENV === "production",
  dsn: "https://8ce4a77ec56a1b9fa5c8081b394c3636@o4507086334001152.ingest.de.sentry.io/4507086337540176",

  // Define how likely traces are sampled. Every sampled trace is a billed
  // Sentry transaction (plus its spans) and, in the browser, a request through
  // the /monitoring tunnel; at 1 this scaled with every page view and prefetch.
  tracesSampleRate: 0.1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});
