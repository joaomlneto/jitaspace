import { gzipSync } from "node:zlib";

import { readOpenContracts } from "~/app/contracts/snapshot";

/**
 * Every open public contract, which the contracts browser loads whole and
 * filters, sorts and searches in the browser (`components/Contracts/snapshot.ts`).
 *
 * Gzipped here rather than by the platform: as JSON it is ~12 MB, and Vercel's
 * CDN caches a function's response only up to 10 MB before compression, so
 * left to the platform it would never be cached. Gzipped it is ~2 MB.
 *
 * Sent as a gzip *file* (`application/gzip`), which the browser inflates
 * itself (`inflateJson`), not as `Content-Encoding: gzip`: the platform does
 * not keep that header reliably. After a deploy on 2026-11-08 it dropped it
 * and brotli-encoded the gzip bytes again, so every browser got gzip it was
 * never told to inflate, and the page could not read the contracts.
 *
 * Cached at the CDN for half an hour, the cadence of the public contracts
 * sync, so the database reads it about once a sync however many visitors
 * open the page.
 */
const CACHE_OK =
  "public, max-age=300, s-maxage=1800, stale-while-revalidate=86400";

/** Past this, gzipped, the snapshot nears Vercel's 4.5 MB response limit. */
const SIZE_WARNING = 3_500_000;

export async function GET(): Promise<Response> {
  // A database failure throws: Next answers 500, uncached, and Sentry records
  // it through `onRequestError`.
  const json = JSON.stringify(await readOpenContracts());
  const body = gzipSync(json);
  if (body.byteLength > SIZE_WARNING) {
    console.warn(
      `Open contracts are ${body.byteLength} bytes gzipped (${json.length} as JSON), nearing Vercel's 4.5 MB response limit.`,
    );
  }
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/gzip",
      "Cache-Control": CACHE_OK,
    },
  });
}
