import { readOpenContractsShard } from "~/app/contracts/snapshot";
import { OPEN_CONTRACT_SHARDS } from "~/components/Contracts/snapshot";

/**
 * One shard of the open public contracts, which the contracts browser loads
 * whole and filters, sorts and searches in the browser
 * (`components/Contracts/snapshot.ts`).
 *
 * Cached at the CDN for half an hour, the cadence of the public contracts
 * sync, so the database reads each shard about once a sync however many
 * visitors open the page. A shard is ~1.6 MB of JSON: under the 4.5 MB a
 * function may answer and the 10 MB the CDN caches.
 */
const CACHE_OK =
  "public, max-age=300, s-maxage=1800, stale-while-revalidate=86400";

/** Past this, the next shard size raise is due (OPEN_CONTRACT_SHARDS). */
const SHARD_SIZE_WARNING = 3_500_000;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shard: string }> },
): Promise<Response> {
  const { shard: raw } = await params;
  const shard = /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
  if (!(shard >= 0 && shard < OPEN_CONTRACT_SHARDS)) {
    return Response.json(
      { error: `Shards are numbered 0 to ${OPEN_CONTRACT_SHARDS - 1}.` },
      { status: 404 },
    );
  }
  // A database failure throws: Next answers 500, uncached, and Sentry records
  // it through `onRequestError`.
  const body = JSON.stringify(await readOpenContractsShard(shard));
  if (body.length > SHARD_SIZE_WARNING) {
    console.warn(
      `Open contracts shard ${shard} is ${body.length} bytes; raise OPEN_CONTRACT_SHARDS before it reaches Vercel's 4.5 MB response limit.`,
    );
  }
  return new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": CACHE_OK,
    },
  });
}
