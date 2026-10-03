import { readBuildDiffIndex } from "~/lib/history-diff";
import {
  badBuild,
  notFound,
  ok,
  parseBuildSegment,
} from "~/lib/history-diff-route";

/**
 * One EVE client build and the diffs that can be fetched for it, as JSON: its
 * date and server, the builds with a stored diff into it (`from`) and out of
 * it (`to`), each with that diff's per-op summary and its URL.
 *
 * The segment is named `from` only because Next requires sibling dynamic
 * segments to share a name with `[from]/[to]`; it is the build being
 * described, on either side of its diffs.
 */

/**
 * Much shorter than a diff's: a build gains an outgoing diff when the next one
 * is processed. Five minutes, like `GET /api/history`, which links here.
 */
const CACHE_OK = "public, max-age=60, s-maxage=300, stale-while-revalidate=600";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ from: string }> },
): Promise<Response> {
  const { from: raw } = await params;
  const build = parseBuildSegment(raw);
  if (build === null) return badBuild();

  // A database failure throws: Next answers 500, uncached, and Sentry records
  // it through `onRequestError`.
  const index = await readBuildDiffIndex(build);
  if (!index) return notFound(`Build ${build} is not in the tracked history.`);
  return ok(index, CACHE_OK);
}
