"use client";

import { useEffect } from "react";

/**
 * Eagerly fetches every remaining page of an infinite query as soon as the
 * next page becomes available.
 *
 * ESI paginates large collections (assets, contacts, ...) but the consumers of
 * these hooks expect the full result set rather than a "load more" UI, so we
 * keep requesting the next page until there are none left.
 */
export function useEagerlyFetchAllPages(query: {
  hasNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
}) {
  const { hasNextPage, fetchNextPage } = query;

  useEffect(() => {
    if (hasNextPage) void fetchNextPage();
  }, [hasNextPage, fetchNextPage]);
}
