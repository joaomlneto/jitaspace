import { cacheLife, cacheTag } from "next/cache";

/**
 * The cache tag on every read of SDE-derived data. `ingest-sde-all` fires
 * `revalidate-sde-cache` once the database is on a new SDE build, which POSTs
 * to `/api/revalidate/sde`, which calls `revalidateTag` with this tag.
 */
export const SDE_CACHE_TAG = "sde";

/**
 * Cache policy for a `"use cache"` scope that reads only static game data: data
 * that changes when a new SDE build is ingested, and at no other time. Call it
 * first thing inside the scope, in place of `cacheLife(...)`.
 *
 * The entry is kept for the longest profile (`cacheLife("max")`: revalidated at
 * most monthly) and tagged {@link SDE_CACHE_TAG}, so it is dropped when the
 * database moves to a new build rather than on a timer. Re-reading on a daily
 * timer only asked CockroachDB the same questions again: this data changes on
 * patch day.
 *
 * Only for tables `ingest-sde-all` writes. Tagging data it does not write (LP
 * store offers, wars, prices, the build-history database) keeps that data
 * stale for up to a month, and nothing reports it. Those keep their own
 * `cacheLife`.
 */
export function cacheSdeRead(): void {
  cacheTag(SDE_CACHE_TAG);
  cacheLife("max");
}
