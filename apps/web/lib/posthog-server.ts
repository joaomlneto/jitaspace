import { PostHog } from "posthog-node";

import { env } from "~/env";

/**
 * Returns a server-side PostHog client, or `null` when no project token is
 * configured (local dev / preview deploys). Callers must null-check the result.
 */
export function getPostHogClient(): PostHog | null {
  const token = env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!token) return null;

  return new PostHog(token, {
    host: env.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });
}
