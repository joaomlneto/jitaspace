import { readPublicContracts } from "~/app/contracts/data";
import { parseContractFilters } from "~/components/Contracts/filters";

/**
 * One page of open public contracts, filtered and sorted as the query string
 * says (`parseContractFilters`), for the `/contracts` browser.
 *
 * Cached at the CDN per query string. The snapshots it reads change at most
 * hourly, so a filter combination costs the database about one read an hour
 * however many visitors use it — the database has a quarter of a vCPU, and the
 * item filter in particular walks every historical listing of that item.
 */
const CACHE_OK =
  "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

export async function GET(request: Request): Promise<Response> {
  const filters = parseContractFilters(new URL(request.url).searchParams);
  // A database failure throws: Next answers 500, uncached, and Sentry records
  // it through `onRequestError`.
  const page = await readPublicContracts(filters);
  return Response.json(page, { headers: { "Cache-Control": CACHE_OK } });
}
