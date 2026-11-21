import { revalidateTag } from "next/cache";

import { isCdnPurgeEnabled, purgeCdnAfterResponse } from "~/lib/cdnPurge";
import { isCronAuthorized } from "~/lib/cronAuth";
import { SDE_CACHE_TAG } from "~/lib/sdeCache";

/**
 * Drops every cache entry tagged {@link SDE_CACHE_TAG}. Called by the
 * `revalidate-sde-cache` background job once `ingest-sde-all` has moved the
 * database to a new SDE build.
 *
 * `"max"` marks the tag stale rather than expiring it: the next request for an
 * affected page is still served the old copy while a fresh one renders in the
 * background. Expiring it instead would make that visitor wait for the render,
 * or get an error page if the database is unavailable at that moment. Nothing
 * is re-read until it is requested, so purging tens of thousands of pages costs
 * nothing up front.
 *
 * Behind a Cloudflare cache that this deploy purges (`lib/cdnPurge.ts`, never
 * on Vercel), the tag is expired instead and the whole zone is purged once the
 * response is sent. A stale page would be re-cached by Cloudflare for its full
 * `s-maxage`; the cost is that each page's next visitor waits for its render.
 */
export function POST(request: Request): Response {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  revalidateTag(SDE_CACHE_TAG, isCdnPurgeEnabled() ? { expire: 0 } : "max");
  purgeCdnAfterResponse({ everything: true });
  return Response.json({ revalidated: SDE_CACHE_TAG });
}
