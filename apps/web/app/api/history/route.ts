import { connection } from "next/server";

import { readHistoryMeta } from "~/lib/history-meta";

/**
 * Entry point of the build-history API, as JSON: the servers tracked
 * (Tranquility and Singularity), the build each runs now per CCP's pointer and
 * how it was recorded, the newest build recorded for each with when it
 * entered the database, and the URL templates of the diff endpoints. See
 * `~/lib/history-meta` for why a server's newest recorded build can trail its
 * live one.
 */

/** Five minutes at the CDN; the upstream monitor polls every fifteen. */
const CACHE_OK = "public, max-age=60, s-maxage=300, stale-while-revalidate=600";

export async function GET(): Promise<Response> {
  // Request-time: argument-free, this would otherwise be prerendered at build,
  // against a database CI does not have, and frozen until revalidated.
  await connection();
  // A database failure throws: Next answers 500, uncached, and Sentry records
  // it through `onRequestError`.
  return Response.json(await readHistoryMeta(), {
    headers: { "Cache-Control": CACHE_OK },
  });
}
