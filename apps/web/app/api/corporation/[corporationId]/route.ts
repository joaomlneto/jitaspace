import { readCorporationProfile } from "~/app/corporation/[corporationId]/data";
import { splitCorporationProfile } from "~/app/corporation/[corporationId]/split";
import { parsePositiveEntityId } from "~/lib/routeParams";

/**
 * The rows behind `/corporation/[corporationId]`'s tables (stations, agents,
 * trade goods, wars), as JSON. The page ships without them, and a tab fetches
 * them when it opens.
 *
 * Cached at the CDN for as long as the corporation read lasts, so the database
 * sees about one read per corporation per hour however many tabs open.
 */
const CACHE_OK =
  "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ corporationId: string }> },
): Promise<Response> {
  const { corporationId: raw } = await params;
  const corporationId = parsePositiveEntityId(raw);
  if (corporationId === null) {
    return Response.json({ error: "Not a corporation id." }, { status: 400 });
  }

  // A database failure throws: Next answers 500, uncached, and Sentry records
  // it through `onRequestError`.
  const profile = await readCorporationProfile(corporationId);
  if (!profile) {
    return Response.json(
      { error: `Corporation ${corporationId} is not in our database.` },
      { status: 404 },
    );
  }
  return Response.json(splitCorporationProfile(profile).tables, {
    headers: { "Cache-Control": CACHE_OK },
  });
}
