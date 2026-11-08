import { readIncursionLayouts } from "~/app/incursions/data";

/**
 * Where each incursion site type spawns, constellation by constellation, as
 * JSON: the Layouts tab of `/incursions` fetches it when it opens.
 *
 * The layouts change only with a deploy, and the staging systems and counts
 * with each new incursion, so the CDN keeps it for an hour.
 */
const CACHE_OK =
  "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

export async function GET(): Promise<Response> {
  // A database failure throws: Next answers 500, uncached, and Sentry records
  // it through `onRequestError`.
  return Response.json(await readIncursionLayouts(), {
    headers: { "Cache-Control": CACHE_OK },
  });
}
