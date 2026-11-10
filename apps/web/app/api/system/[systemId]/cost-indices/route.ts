import {
  readSolarSystemCostIndexHistory,
  readSolarSystemCostIndicesAt,
} from "~/app/system/[systemId]/costIndexData";
import { isCostIndexRange } from "~/app/system/[systemId]/costIndices";
import { parsePositiveEntityId } from "~/lib/routeParams";

/**
 * A solar system's industry cost indices from our history, as JSON.
 *
 * - `?range=7d|30d|90d|1y|all` (default `30d`): every change over the range
 *   (one per day for `1y` and `all`), with the gaps in the record. The system
 *   page's chart.
 * - `?at=<ISO time>`: the values in force at that moment, and whether a
 *   snapshot was taken close enough to vouch for them.
 *
 * Cached at the CDN for the hour the job takes to add a snapshot, so the
 * database sees about one read per system and range per hour.
 */
const CACHE_OK =
  "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";
/**
 * An answer about a moment with a later snapshot already recorded never
 * changes: the record is only ever appended to.
 */
const CACHE_PAST =
  "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ systemId: string }> },
): Promise<Response> {
  const { systemId: raw } = await params;
  const solarSystemId = parsePositiveEntityId(raw);
  if (solarSystemId === null) {
    return Response.json({ error: "Not a solar system id." }, { status: 400 });
  }
  const search = new URL(request.url).searchParams;

  // A database failure throws: Next answers 500, uncached, and Sentry records
  // it through `onRequestError`.
  const atParam = search.get("at");
  if (atParam !== null) {
    const at = new Date(atParam);
    if (Number.isNaN(at.getTime())) {
      return Response.json(
        { error: "`at` must be an ISO 8601 time." },
        { status: 400 },
      );
    }
    const answer = await readSolarSystemCostIndicesAt(solarSystemId, at);
    return Response.json(answer, {
      headers: {
        "Cache-Control": answer.nextObservedAt === null ? CACHE_OK : CACHE_PAST,
      },
    });
  }

  const range = search.get("range") ?? "30d";
  if (!isCostIndexRange(range)) {
    return Response.json(
      { error: "`range` must be one of 7d, 30d, 90d, 1y, all." },
      { status: 400 },
    );
  }
  return Response.json(
    await readSolarSystemCostIndexHistory(solarSystemId, range),
    { headers: { "Cache-Control": CACHE_OK } },
  );
}
