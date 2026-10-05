import { revalidateTag } from "next/cache";

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
 */
export function POST(request: Request): Response {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  revalidateTag(SDE_CACHE_TAG, "max");
  return Response.json({ revalidated: SDE_CACHE_TAG });
}
