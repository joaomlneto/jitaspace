"use client";

import { useEffect } from "react";

/**
 * How long an eagerly-walked collection counts as fresh.
 *
 * A refetch of an infinite query re-requests EVERY page it holds, and with
 * react-query's default staleTime of 0 that happened on every window focus and
 * every remount — a full re-walk of a character's assets each time the user
 * alt-tabbed back. ESI caches these collections server-side (contacts for 5
 * minutes, assets for an hour), so a refetch sooner than that only returns the
 * same cached pages. This is the shorter of the two.
 */
export const EAGER_WALK_STALE_TIME_MS = 5 * 60 * 1000;

/**
 * Eagerly fetches every remaining page of an infinite query.
 *
 * ESI paginates large collections (assets, contacts, ...) but the consumers of
 * these hooks expect the full result set rather than a "load more" UI, so we
 * keep requesting the next page until there are none left.
 *
 * The effect is keyed on the number of pages loaded so far, not only on
 * `hasNextPage`. `hasNextPage` stays `true` from the first page to the
 * second-to-last, and react-query binds `fetchNextPage` once per observer, so
 * an effect keyed on those two alone fires once and the walk stops at page 2 —
 * which silently truncated every collection longer than two pages.
 *
 * A failed page stops the walk rather than retrying it on every render, and
 * the error is part of the key so the walk resumes if a later refetch clears
 * it.
 *
 * Pass the query's own `enabled`: `fetchNextPage` is imperative and ignores
 * it, so without this a walk would carry on after its query was disabled, and
 * a partly walked query left in the cache would resume on mount even while
 * disabled.
 */
export function useEagerlyFetchAllPages(query: {
  data?: { pages: readonly unknown[] };
  error?: unknown;
  hasNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
  /** Whether the query is enabled. Default true. */
  enabled?: boolean;
}) {
  const { hasNextPage, fetchNextPage, enabled = true } = query;
  const loadedPages = query.data?.pages.length ?? 0;
  const failed = query.error != null;

  useEffect(() => {
    if (enabled && hasNextPage && !failed) void fetchNextPage();
  }, [enabled, hasNextPage, failed, loadedPages, fetchNextPage]);
}
