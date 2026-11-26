import { after } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { env } from "~/env";

/**
 * Purges a Cloudflare cache in front of a self-hosted deploy, for the
 * `/api/revalidate/*` routes.
 *
 * On Vercel, `revalidateTag` and `revalidatePath` also clear Vercel's CDN, so
 * nothing more is needed. Anywhere else they only clear the server's own cache.
 * A CDN that caches HTML keeps its copy for the page's whole `s-maxage` (7 days
 * for an item, 30 for a system), so after an SDE update or an alliance change
 * visitors would keep getting the old page. Set `CLOUDFLARE_ZONE_ID` and
 * `CLOUDFLARE_API_TOKEN` (a token with the Cache Purge permission) to purge it
 * too. Leave them unset on Vercel.
 *
 * Purging comes with a rule for the routes: while it is enabled
 * ({@link isCdnPurgeEnabled}), they must **expire** what they revalidate rather
 * than mark it stale (`"max"`). Next serves a stale page with its full
 * `s-maxage` while the fresh one renders in the background, so the CDN's first
 * request after the purge would cache the old page again for days.
 */

/** What to purge: the whole zone, or every URL under some site paths. */
export type CdnPurge = { everything: true } | { pathPrefixes: string[] };

/** Cloudflare's cap on prefixes in one purge request (every plan). */
export const MAX_PURGE_PREFIXES = 100;

/** Whether this deploy purges a CDN when it revalidates. */
export function isCdnPurgeEnabled(): boolean {
  return Boolean(env.CLOUDFLARE_ZONE_ID && env.CLOUDFLARE_API_TOKEN);
}

/**
 * The `purge_cache` request body for `purge`.
 *
 * Paths are purged by prefix, which also clears their query-string variants:
 * client-side navigations fetch `?_rsc=…` URLs, which Cloudflare caches
 * separately and a purge by exact URL would miss. A prefix is matched as a
 * plain string, so `/alliance/1` also purges `/alliance/12`: a few extra cache
 * misses, never a stale page. With no site host to build prefixes from, or more
 * prefixes than one request takes, the whole zone is purged instead (Cloudflare
 * allows 5 such requests a minute on the free plan, so one request it is).
 */
export function cdnPurgeBody(
  purge: CdnPurge,
  siteHost: string | undefined,
): { purge_everything: true } | { prefixes: string[] } {
  if (
    "everything" in purge ||
    !siteHost ||
    purge.pathPrefixes.length > MAX_PURGE_PREFIXES
  ) {
    return { purge_everything: true };
  }
  return { prefixes: purge.pathPrefixes.map((path) => `${siteHost}${path}`) };
}

/** Sends one purge request to Cloudflare. Throws if it is not accepted. */
export async function purgeCdn(purge: CdnPurge): Promise<void> {
  const zoneId = env.CLOUDFLARE_ZONE_ID;
  const token = env.CLOUDFLARE_API_TOKEN;
  if (!zoneId || !token) return;

  const siteHost = env.NEXT_PUBLIC_SITE_URL
    ? new URL(env.NEXT_PUBLIC_SITE_URL).host
    : undefined;
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(zoneId)}/purge_cache`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cdnPurgeBody(purge, siteHost)),
    },
  );
  const result = (await response.json().catch(() => null)) as {
    success?: boolean;
    errors?: unknown;
  } | null;
  if (!response.ok || result?.success !== true) {
    throw new Error(
      `Cloudflare cache purge failed (HTTP ${response.status}): ${JSON.stringify(result?.errors ?? result)}`,
    );
  }
}

/**
 * Purges the CDN once this response has been sent, if purging is enabled.
 *
 * It must run after the response, not inside the route handler: Next applies a
 * handler's `revalidateTag`/`revalidatePath` calls only once the handler
 * returns, so a purge sent from inside it could reach Cloudflare, and Cloudflare
 * refetch the page, before the page is expired. A failed purge is reported to
 * Sentry and does not fail the revalidation, which has already happened.
 */
export function purgeCdnAfterResponse(purge: CdnPurge): void {
  if (!isCdnPurgeEnabled()) return;
  after(async () => {
    try {
      await purgeCdn(purge);
    } catch (error) {
      console.error(error);
      Sentry.captureException(error);
    }
  });
}
