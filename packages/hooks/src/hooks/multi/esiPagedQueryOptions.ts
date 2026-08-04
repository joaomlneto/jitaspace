import type { ResponseConfig } from "@jitaspace/esi-client";

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
 * requested concurrently. The result is shaped like any other ESI response so
 * callers cannot tell a paginated endpoint from a single-page one.
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
    queryKey,
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

      const remaining = await Promise.all(
        Array.from({ length: pageCount - 1 }, (_, index) =>
          fetchPage(index + 2, signal),
        ),
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
