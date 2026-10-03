import { buildDiffsUrl, readBuildDiff } from "~/lib/history-diff";
import {
  badBuild,
  notFound,
  ok,
  parseBuildSegment,
} from "~/lib/history-diff-route";

/**
 * Entity-level diff between two adjacent EVE client builds, as JSON: every
 * entity a stored diff added, modified or removed, per collection.
 *
 * Only diffs the history database stores are served; a pair without one —
 * any non-adjacent pair included — is a 404 pointing at `/diff/{from}`, which
 * lists the pairs that exist. Composing ranges is what `/history/compare`
 * does, behind BotID; see `~/lib/history-diff` for why this one is public.
 * Field values are not included: a stored `modified` change holds only the
 * fields that moved, not the record.
 */

/**
 * A stored diff does not change, so the CDN keeps it a day and serves the
 * old copy while revalidating for up to 30 days. Not `immutable`, so a diff
 * read while its changes were still being written can heal.
 */
const CACHE_OK =
  "public, max-age=3600, s-maxage=86400, stale-while-revalidate=2592000";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ from: string; to: string }> },
): Promise<Response> {
  const { from: rawFrom, to: rawTo } = await params;
  const from = parseBuildSegment(rawFrom);
  const to = parseBuildSegment(rawTo);
  if (from === null || to === null) return badBuild();

  // A database failure throws: Next answers 500, uncached, and Sentry records
  // it through `onRequestError`.
  const diff = await readBuildDiff(from, to);
  if (!diff)
    return notFound(
      `No stored diff from build ${from} to build ${to}. Only adjacent builds ` +
        `can be diffed; ${buildDiffsUrl(from)} lists the diffs available ` +
        `for build ${from}.`,
    );
  return ok(diff, CACHE_OK);
}
