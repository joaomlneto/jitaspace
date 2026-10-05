import { readAllianceProfile } from "~/app/alliance/[allianceId]/data";
import { splitAllianceProfile } from "~/app/alliance/[allianceId]/split";
import { parsePositiveEntityId } from "~/lib/routeParams";

/**
 * The rows behind `/alliance/[allianceId]`'s tables (member corporations,
 * sovereignty systems, wars), as JSON. The page ships without them, since they
 * are most of its weight, and a tab fetches them when it opens.
 *
 * Cached at the CDN for as long as the alliance read lasts, so the database
 * sees about one read per alliance per hour however many tabs open.
 */
const CACHE_OK =
  "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ allianceId: string }> },
): Promise<Response> {
  const { allianceId: raw } = await params;
  const allianceId = parsePositiveEntityId(raw);
  if (allianceId === null) {
    return Response.json({ error: "Not an alliance id." }, { status: 400 });
  }

  // A database failure throws: Next answers 500, uncached, and Sentry records
  // it through `onRequestError`.
  const profile = await readAllianceProfile(allianceId);
  if (!profile) {
    return Response.json(
      { error: `Alliance ${allianceId} is not in our database.` },
      { status: 404 },
    );
  }
  return Response.json(splitAllianceProfile(profile).tables, {
    headers: { "Cache-Control": CACHE_OK },
  });
}
