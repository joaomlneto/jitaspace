import { readContractHistory } from "~/app/contracts/history";
import { parseContractHistoryQuery } from "~/components/Contracts/history";

/**
 * One page of the public contracts a character, corporation or type appears
 * in (`?characterId=`, `?corporationId=` or `?typeId=`, plus `before=` for the
 * pages after the first), for the Contracts tab of their pages.
 *
 * Cached at the CDN like `/api/contracts`: the snapshots change at most every
 * half hour, and a page below a contract id only changes as its contracts end.
 */
const CACHE_OK =
  "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

export async function GET(request: Request): Promise<Response> {
  const query = parseContractHistoryQuery(new URL(request.url).searchParams);
  if (query === null) {
    return Response.json(
      {
        error:
          "Name one positive characterId, corporationId or typeId, and optionally a before contract id.",
      },
      { status: 400 },
    );
  }
  // A database failure throws: Next answers 500, uncached, and Sentry records
  // it through `onRequestError`.
  const page = await readContractHistory(query);
  return Response.json(page, { headers: { "Cache-Control": CACHE_OK } });
}
