import type {
  EsiCursor,
  EsiCursorDirection,
  EsiCursorPageRequest,
  ResponseConfig,
} from "@jitaspace/esi-client";
import {
  EsiCursorCeilingError,
  shouldRetryEsiRequest,
  walkEsiCursor,
} from "@jitaspace/esi-client";

import { ESI_QUERY_KEY_MARKER, markEsiQueryKey } from "./esiQueryKeys";

// The walk itself lives in @jitaspace/esi-client, so server renders page a
// cursor collection exactly as the browser does. Re-exported here because the
// hooks that build on it have always imported them from this module.
export type { EsiCursor, EsiCursorDirection, EsiCursorPageRequest };
export {
  ESI_CURSOR_PAGE_SIZE,
  ESI_NO_CACHE_HEADERS,
  EsiCursorCeilingError,
} from "@jitaspace/esi-client";

/**
 * Query options that walk a cursor-paginated ESI collection to its end, as a
 * single query whose data is every record. See `walkEsiCursor` for how the
 * walk starts, stops and repairs duplicates.
 *
 * Pass the endpoint's generated query key, built with the same params the walk
 * starts from; the all-pages marker from {@link ESI_QUERY_KEY_MARKER} is
 * appended so the walk never shares a cache entry with a single-page query.
 */
export function esiCursorQueryOptions<
  TResponse extends { cursor?: EsiCursor },
  TItem,
>(config: {
  queryKey: readonly unknown[];
  direction: EsiCursorDirection;
  fetchPage: (
    cursor: string,
    request: EsiCursorPageRequest,
  ) => Promise<ResponseConfig<TResponse>>;
  items: (data: TResponse) => TItem[];
  key?: (item: TItem) => string | number;
  enabled?: boolean;
}) {
  const { queryKey, enabled, ...walk } = config;

  return {
    queryKey: markEsiQueryKey(queryKey, ESI_QUERY_KEY_MARKER.allPages),
    enabled,
    retry: (failureCount: number, error: Error) =>
      !(error instanceof EsiCursorCeilingError) &&
      shouldRetryEsiRequest(failureCount, error),
    queryFn: ({ signal }: { signal?: AbortSignal } = {}): Promise<TItem[]> =>
      walkEsiCursor({ ...walk, signal }),
  };
}
