import { initBotId } from "botid/client/core";
import posthog from "posthog-js";

import { env } from "~/env";

// Only initialize PostHog when a project token is configured. Without this
// guard, posthog-js logs warnings on every page load in local dev / preview
// deploys that have no PostHog project.
if (env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) {
  posthog.init(env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN, {
    api_host: "/ingest",
    ui_host: "https://eu.posthog.com",
    defaults: "2026-01-30",
    capture_exceptions: true,
    debug: env.NODE_ENV === "development",
  });
}

// Define the paths that need bot protection.
// These are paths that are routed to by your app.
// These can be:
// - API endpoints (e.g., '/api/checkout')
// - Server actions invoked from a page (e.g., '/dashboard')
// - Dynamic routes (e.g., '/api/create/*')

initBotId({
  protect: [
    /*
    {
      path: "/api/checkout",
      method: "POST",
    },
    {
      // Wildcards can be used to expand multiple segments
      // /team/* /activate will match
      // /team/a/activate
      // /team/a/b/activate
      // /team/a/b/c/activate
      // ...
      path: "/team/* /activate",
      method: "POST",
    },
    {
      // Wildcards can also be used at the end for dynamic routes
      path: "/api/user/*",
      method: "POST",
    },*/
  ],
});
