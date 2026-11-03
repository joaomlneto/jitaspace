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
 * ESI marks every cursor page `max-age=31536000, immutable` (measured
 * 2026-11-03), the first `before=0` and `after=0` pages included, although
 * those change whenever a job does. Left alone, the browser answers each
 * refetch from its own cache for a year, hard reloads included, and a walk
 * keeps returning the jobs as they were on the first visit. A request
 * `no-cache` makes it go back to ESI, whose CORS policy allows the header.
 */
export const ESI_CURSOR_NO_CACHE_HEADERS = {
  "Cache-Control": "no-cache",
} as const;

/** The request config a cursor walk hands each page fetch. */
export interface EsiCursorPageRequest {
  signal?: AbortSignal;
  headers: typeof ESI_CURSOR_NO_CACHE_HEADERS;
}

function dedupeKeepingLatest<TItem>(
  records: TItem[],
  key: (item: TItem) => string | number,
): TItem[] {
  const byKey = new Map<string | number, TItem>();
  for (const record of records) byKey.set(key(record), record);
  return byKey.size === records.length ? records : [...byKey.values()];
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
 * Each page is a separate snapshot, so a record modified mid-walk can also be
 * missed: a `before` walk has already passed the end it moves to. The next
 * refetch picks it up; only `key` duplicates are repaired within a walk.
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
  /**
   * Fetch one page. Pass `request` as the generated client's request config
   * (its last argument): it carries the abort signal and the header that keeps
   * the browser from answering from its cache.
   */
  fetchPage: (
    cursor: string,
    request: EsiCursorPageRequest,
  ) => Promise<ResponseConfig<TResponse>>;
  /** The page's records, e.g. `(data) => data.freelance_jobs`. */
  items: (data: TResponse) => TItem[];
  /**
   * A record's identity, to drop the copies a walk can read twice. Pages are
   * ordered by modification time, so a record modified mid-walk moves to the
   * far end and an `after` walk reaches it again; the later copy is the newer
   * one and replaces the earlier, keeping the earlier's place.
   */
  key?: (item: TItem) => string | number;
  enabled?: boolean;
}) {
  const { queryKey, direction, fetchPage, items, key, enabled } = config;

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
      const request: EsiCursorPageRequest = {
        signal,
        headers: ESI_CURSOR_NO_CACHE_HEADERS,
      };
      let cursor = "0";
      for (let page = 0; page < MAX_CURSOR_PAGES; page++) {
        const { data } = await fetchPage(cursor, request);
        const pageRecords = items(data);
        records.push(...pageRecords);
        const next = data.cursor?.[direction];
        if (
          pageRecords.length < ESI_CURSOR_PAGE_SIZE ||
          next === undefined ||
          next === "" ||
          next === cursor
        ) {
          return key ? dedupeKeepingLatest(records, key) : records;
        }
        cursor = next;
      }
      throw new EsiCursorCeilingError();
    },
  };
}
