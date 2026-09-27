"use client";

import { useEffect } from "react";

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
 */
export function useEagerlyFetchAllPages(query: {
  data?: { pages: readonly unknown[] };
  error?: unknown;
  hasNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
}) {
  const { hasNextPage, fetchNextPage } = query;
  const loadedPages = query.data?.pages.length ?? 0;
  const failed = query.error != null;

  useEffect(() => {
    if (hasNextPage && !failed) void fetchNextPage();
  }, [hasNextPage, failed, loadedPages, fetchNextPage]);
}
