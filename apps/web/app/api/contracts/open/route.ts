import { gzipSync } from "node:zlib";

import { readOpenContracts } from "~/app/contracts/snapshot";

/**
 * Every open public contract, which the contracts browser loads whole and
 * filters, sorts and searches in the browser (`components/Contracts/snapshot.ts`).
 *
 * Gzipped here rather than by the platform: as JSON it is ~12 MB, past the
 * 4.5 MB a Vercel function may answer and the 10 MB its CDN caches, and ~2.5
 * MB gzipped. Every browser accepts gzip, so there is one encoding to cache.
 *
 * Cached at the CDN for half an hour, the cadence of the public contracts
 * sync, so the database reads it about once a sync however many visitors
 * open the page.
 */
const CACHE_OK =
  "public, max-age=300, s-maxage=1800, stale-while-revalidate=86400";

/** Past this, gzipped, the response nears Vercel's 4.5 MB limit. */
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
      "Content-Type": "application/json",
      "Content-Encoding": "gzip",
      "Cache-Control": CACHE_OK,
    },
  });
}
