import type { EsiCursor, ResponseConfig } from "@jitaspace/esi-client";
import {
  EsiCursorCeilingError,
  fetchAllEsiCursorPages,
  shouldRetryEsiRequest,
} from "@jitaspace/esi-client";

import { ESI_QUERY_KEY_MARKER, markEsiQueryKey } from "../utils/esiQueryKeys";

/**
 * Query options that fetch *every* record of a cursor-paginated ESI collection
 * as a single query — the cursor counterpart of `esiPagedQueryOptions`.
 *
 * The multi-subject generator skips cursor endpoints rather than emit a hook
 * that silently returns the first page, so these are wired by hand through
 * `defineMultiEsiQuery`, passing this as the `query`.
 *
 * Pass the endpoint's generated query key; the returned options append the
 * all-pages marker to it, since the whole walk is a different resource from
 * the single page the generated hook fetches.
 */
export function esiCursorQueryOptions<
  TPage extends { cursor?: EsiCursor },
  TItem,
>(config: {
  queryKey: readonly unknown[];
  fetchPage: (
    before: string | undefined,
    signal?: AbortSignal,
  ) => Promise<ResponseConfig<TPage>>;
  itemsOf: (page: TPage) => TItem[];
}) {
  const { queryKey, fetchPage, itemsOf } = config;

  return {
    queryKey: markEsiQueryKey(queryKey, ESI_QUERY_KEY_MARKER.allPages),
    // The ceiling is reached the same way on every attempt; anything else
    // follows the app-wide ESI policy.
    retry: (failureCount: number, error: Error) =>
      !(error instanceof EsiCursorCeilingError) &&
      shouldRetryEsiRequest(failureCount, error),
    queryFn: ({ signal }: { signal?: AbortSignal } = {}): Promise<
      ResponseConfig<TItem[]>
    > => fetchAllEsiCursorPages((before) => fetchPage(before, signal), itemsOf),
  };
}
