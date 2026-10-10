import { readTypeInsuranceHistory } from "~/lib/insuranceData";
import { parsePositiveEntityId } from "~/lib/routeParams";

/**
 * A type's insurance price history, as JSON: every price it has had since
 * December 2022. The item page ships only the latest prices, and its Insurance
 * tab fetches this when it opens.
 *
 * Cached at the CDN for an hour, as long as the read lasts: the job records a
 * new observation hourly. Served stale for at most another hour, so the chart
 * trails the page's current prices (also cached for hours) by little.
 */
const CACHE_OK =
  "public, max-age=300, s-maxage=3600, stale-while-revalidate=3600";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ typeId: string }> },
): Promise<Response> {
  const { typeId: raw } = await params;
  const typeId = parsePositiveEntityId(raw);
  if (typeId === null) {
    return Response.json({ error: "Not a type id." }, { status: 400 });
  }

  // A database failure throws: Next answers 500, uncached, and Sentry records
  // it through `onRequestError`. A type never insured answers an empty list.
  const history = await readTypeInsuranceHistory(typeId);
  return Response.json(history, { headers: { "Cache-Control": CACHE_OK } });
}
