import { createHash, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";

import { env } from "~/env";
import { SDE_CACHE_TAG } from "~/lib/sdeCache";

/**
 * Whether the request carries `Authorization: Bearer <CRON_SECRET>`.
 *
 * Both sides are hashed before comparing so `timingSafeEqual` sees two
 * equal-length buffers and the comparison time does not reveal the secret's
 * length. An unset or short secret authorizes nothing: without that guard, a
 * deployment running with `SKIP_ENV_VALIDATION` would accept
 * `Bearer undefined`.
 */
function isAuthorized(request: Request): boolean {
  const secret = env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const header = request.headers.get("authorization");
  if (header === null) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}

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
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  revalidateTag(SDE_CACHE_TAG, "max");
  return Response.json({ revalidated: SDE_CACHE_TAG });
}
