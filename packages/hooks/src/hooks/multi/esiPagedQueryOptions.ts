import type { ResponseConfig } from "@jitaspace/esi-client";

/**
 * Marker appended to the generated query key so the "every page" query cannot
 * collide with the generated single-page one.
 *
 * Both produce `ResponseConfig<TItem[]>`, so a shared key would be silent wrong
 * data rather than a type error: whichever query mounts first populates the
 * entry and the other reads it as its own. They are genuinely different
 * resources, so they get different keys.
 */
export const ALL_PAGES_QUERY_KEY_MARKER = "all-pages";

/**
 * How many page requests may be in flight at once, per query.
 *
 * Unbounded `Promise.all` over `x-pages` turns a 60-page collection into a
 * 59-request burst, multiplied by every subject in the fan-out — against an API
 * that rate-limits on error rate. A small pool keeps nearly all of the latency
 * win over sequential paging while bounding the blast radius.
 */
const MAX_CONCURRENT_PAGE_REQUESTS = 5;

async function fetchInPool<TResult>(
  count: number,
  fetchOne: (index: number) => Promise<TResult>,
): Promise<TResult[]> {
  const results = new Array<TResult>(count);
  let next = 0;

  const worker = async (): Promise<void> => {
    while (next < count) {
      const index = next++;
      results[index] = await fetchOne(index);
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(MAX_CONCURRENT_PAGE_REQUESTS, count) },
      worker,
    ),
  );

  return results;
}

/**
 * Query options that fetch *every* page of a paginated ESI collection as a
 * single query.
 *
 * 31 of the 111 subject-scoped ESI GET routes paginate via a `page` query
 * parameter and an `x-pages` response header. `useQueries` cannot run infinite
 * queries, so the multi-subject hooks cannot reuse the `*Infinite` variants —
 * but they do not need to: every existing consumer of those infinite queries
 * pages through the whole collection immediately anyway (see
 * `useEagerlyFetchAllPages`), so "fetch all pages" is the real requirement and
 * a plain query expresses it directly.
 *
 * The first page is fetched to learn the page count, then the remainder are
 * requested through a small concurrency pool. The result is shaped like any
 * other ESI response so callers cannot tell a paginated endpoint from a
 * single-page one.
 *
 * Pass the endpoint's generated query key; the returned options append
 * {@link ALL_PAGES_QUERY_KEY_MARKER} to it.
 */
export function esiPagedQueryOptions<TItem>(config: {
  queryKey: readonly unknown[];
  fetchPage: (
    page: number,
    signal?: AbortSignal,
  ) => Promise<ResponseConfig<TItem[]>>;
  enabled?: boolean;
}) {
  const { queryKey, fetchPage, enabled } = config;

  return {
    queryKey: [...queryKey, ALL_PAGES_QUERY_KEY_MARKER],
    enabled,
    // The signal is threaded into every page so an unmount or refetch cancels
    // the whole fan-out rather than leaving pages in flight against ESI.
    queryFn: async ({ signal }: { signal?: AbortSignal } = {}): Promise<
      ResponseConfig<TItem[]>
    > => {
      const firstPage = await fetchPage(1, signal);

      const xPages: unknown = firstPage.headers["x-pages"];
      const pageCount = typeof xPages === "string" ? Number(xPages) : 1;
      if (!Number.isFinite(pageCount) || pageCount <= 1) return firstPage;

      const remaining = await fetchInPool(pageCount - 1, (index) =>
        fetchPage(index + 2, signal),
      );

      return {
        ...firstPage,
        data: [
          ...firstPage.data,
          ...remaining.flatMap((response) => response.data),
        ],
      };
    },
  };
}
