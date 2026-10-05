import {
  readFactionLiveData,
  readFactionSdeData,
  splitFactionData,
} from "~/app/faction/[factionId]/data";
import { parsePositiveEntityId } from "~/lib/routeParams";

/**
 * The rows behind `/faction/[factionId]`'s tables (territory, corporations,
 * enlisted militia, items, contraband, missions, dungeons, standing
 * requirements), as JSON. The page ships without them, since they are most of
 * its weight, and a tab fetches them when it opens.
 *
 * Cached at the CDN for as long as the hourly half of the data lasts, so the
 * database sees about one read per faction per hour however many tabs open.
 */
const CACHE_OK =
  "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ factionId: string }> },
): Promise<Response> {
  const { factionId: raw } = await params;
  const factionId = parsePositiveEntityId(raw);
  if (factionId === null) {
    return Response.json({ error: "Not a faction id." }, { status: 400 });
  }

  // A database failure throws: Next answers 500, uncached, and Sentry records
  // it through `onRequestError`.
  const sde = await readFactionSdeData(factionId);
  if (!sde) {
    return Response.json(
      { error: `Faction ${factionId} does not exist.` },
      { status: 404 },
    );
  }
  const live = await readFactionLiveData(
    factionId,
    sde.militiaCorporation?.id ?? null,
  );
  return Response.json(splitFactionData(sde, live).tables, {
    headers: { "Cache-Control": CACHE_OK },
  });
}
