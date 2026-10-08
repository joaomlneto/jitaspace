import { readIncursionHistory } from "~/app/incursions/data";

/**
 * Every ended incursion (ours and the imported 2015–2023 history) and every
 * appearance, state change and end, as JSON: the History tab of `/incursions`
 * fetches it when it opens, since it is far heavier than the page itself.
 *
 * Cached at the CDN for as long as the read lasts, so the database sees about
 * one read every few minutes however many tabs open.
 */
const CACHE_OK =
  "public, max-age=60, s-maxage=300, stale-while-revalidate=3600";

export async function GET(): Promise<Response> {
  // A database failure throws: Next answers 500, uncached, and Sentry records
  // it through `onRequestError`.
  return Response.json(await readIncursionHistory(), {
    headers: { "Cache-Control": CACHE_OK },
  });
}
