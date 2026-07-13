"use client";

import { useEagerlyFetchAllPages } from "./useEagerlyFetchAllPages";

interface EsiContactsInfiniteQuery<TContact> {
  data?: { pages: { data: TContact[] }[] };
  error: unknown;
  isLoading: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
  refetch: () => unknown;
}

interface EsiContactsLabelsQuery<TLabel> {
  data?: { data: TLabel[] };
}

/**
 * Shared implementation behind the character / corporation / alliance contact
 * hooks. Given the already-instantiated infinite contacts query and labels
 * query, it eagerly loads every contacts page and exposes the flattened list.
 */
export function useEsiContacts<TContact, TLabel>(
  contactsQuery: EsiContactsInfiniteQuery<TContact>,
  labelsQuery: EsiContactsLabelsQuery<TLabel>,
) {
  useEagerlyFetchAllPages(contactsQuery);

  return {
    data: (contactsQuery.data?.pages ?? []).flatMap((page) => page.data),
    labels: labelsQuery.data?.data ?? [],
    error: contactsQuery.error,
    isLoading: contactsQuery.isLoading,
    mutate: contactsQuery.refetch,
  };
}
