import type { ResponseConfig } from "@jitaspace/esi-client";
import { shouldRetryEsiRequest } from "@jitaspace/esi-client";

import { ESI_QUERY_KEY_MARKER, markEsiQueryKey } from "./esiQueryKeys";

/**
 * Which way a cursor walk goes.
 *
 * ESI documents `before` and `after` as walking backwards and forwards in
 * time, starting from `"0"`. On `/freelance-jobs` they turn out to read
 * different collections, not one collection in two orders (measured
 * 2026-10-30): walking `before` from `"0"` returns only the jobs that are still
 * active (408 at the time), newest first, and stops; walking `after` from `"0"`
 * returns every job ever modified, finished ones included (19,545), oldest
 * first. Calling the endpoint without a cursor returns the first `before` page.
 */
export type EsiCursorDirection = "before" | "after";

/** The `cursor` object ESI returns alongside each cursor-paginated page. */
export interface EsiCursor {
  before?: string;
  after?: string;
}

/**
 * Records per request. ESI's maximum, and ten times its default: a cursor walk
 * is sequential, so fewer, larger pages are what keeps it short.
 */
export const ESI_CURSOR_PAGE_SIZE = 100;

/**
 * Hard ceiling on requests per walk.
 *
 * Cursor pages cannot be fetched in parallel — each request needs the cursor
 * the previous one returned — so this bounds how long a walk can take as well
 * as how many requests it makes. 200 pages of 100 covers a freelance job at
 * its 10,000-participant maximum twice over, and a corporation's whole job
 * history; the public feed of every job ever (~200 pages and growing) is the
 * one collection expected to trip it.
 */
const MAX_CURSOR_PAGES = 200;

/**
 * Thrown when a walk reaches {@link MAX_CURSOR_PAGES} without ESI running out
 * of records.
 *
 * Refusing rather than returning what was read so far, for the same reason
 * `esiPagedQueryOptions` refuses above its ceiling: a partial collection looks
 * complete. Not retried, since a retry walks the same pages to the same end.
 */
export class EsiCursorCeilingError extends Error {
  constructor() {
    super(
      `ESI returned more than ${MAX_CURSOR_PAGES} cursor pages for one collection. Refusing rather than returning a partial collection that would look complete.`,
    );
    this.name = "EsiCursorCeilingError";
  }
}

/**
 * Query options that walk a cursor-paginated ESI collection to its end, as a
 * single query whose data is every record.
 *
 * Twelve ESI routes paginate by an opaque `before`/`after` cursor instead of a
 * `page` number (`x-pagination: cursor` in the spec), so neither
 * `esiPagedQueryOptions` nor the generated infinite hooks can page them. This
 * starts at `"0"`, follows the cursor ESI hands back in `direction`, and stops
 * at the first page shorter than {@link ESI_CURSOR_PAGE_SIZE}: ESI fills every
 * page while records remain, so a short one — usually an empty one — is the
 * last. It also stops if ESI returns no cursor, or the same cursor again, so a
 * misbehaving response cannot loop.
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
    signal?: AbortSignal,
  ) => Promise<ResponseConfig<TResponse>>;
  /** The page's records, e.g. `(data) => data.freelance_jobs`. */
  items: (data: TResponse) => TItem[];
  enabled?: boolean;
}) {
  const { queryKey, direction, fetchPage, items, enabled } = config;

  return {
    queryKey: markEsiQueryKey(queryKey, ESI_QUERY_KEY_MARKER.allPages),
    enabled,
    retry: (failureCount: number, error: Error) =>
      !(error instanceof EsiCursorCeilingError) &&
      shouldRetryEsiRequest(failureCount, error),
    queryFn: async ({ signal }: { signal?: AbortSignal } = {}): Promise<
      TItem[]
    > => {
      const records: TItem[] = [];
      let cursor = "0";
      for (let page = 0; page < MAX_CURSOR_PAGES; page++) {
        const { data } = await fetchPage(cursor, signal);
        const pageRecords = items(data);
        records.push(...pageRecords);
        const next = data.cursor?.[direction];
        if (
          pageRecords.length < ESI_CURSOR_PAGE_SIZE ||
          next === undefined ||
          next === "" ||
          next === cursor
        ) {
          return records;
        }
        cursor = next;
      }
      throw new EsiCursorCeilingError();
    },
  };
}
