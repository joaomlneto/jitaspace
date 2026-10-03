import { parsePositiveEntityId } from "~/lib/routeParams";

/**
 * Shared response helpers for the build-diff API routes
 * (`app/api/history/diff/`); the reads live in `~/lib/history-diff`.
 */

/** Largest value of `Build.buildNumber` (INT4): Prisma rejects anything above. */
const MAX_BUILD_NUMBER = 2_147_483_647;

/** A build-number path segment, or `null` unless it is canonical and in range. */
export const parseBuildSegment = (raw: string) => {
  const build = parsePositiveEntityId(raw);
  return build !== null && build <= MAX_BUILD_NUMBER ? build : null;
};

/** A 404 is cached briefly: the build or diff may be ingested soon. */
const CACHE_NOT_FOUND = "public, max-age=300, s-maxage=300";

export const badBuild = () =>
  Response.json(
    { error: "Builds must be positive integer build numbers." },
    { status: 400 },
  );

export const notFound = (message: string) =>
  Response.json(
    { error: message },
    { status: 404, headers: { "Cache-Control": CACHE_NOT_FOUND } },
  );

export const ok = (body: unknown, cacheControl: string) =>
  Response.json(body, { headers: { "Cache-Control": cacheControl } });
