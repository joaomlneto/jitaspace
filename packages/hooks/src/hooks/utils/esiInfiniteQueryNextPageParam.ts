/**
 * `getNextPageParam` for ESI infinite queries.
 *
 * ESI reports the total number of pages in the `x-pages` response header. The
 * next page is the following 1-based index, until that page count is reached
 * (at which point there is no next page).
 */
export function esiInfiniteQueryNextPageParam(
  lastPage: { headers: Record<string, unknown> },
  pages: readonly unknown[],
): number | undefined {
  const xPages: unknown = lastPage.headers["x-pages"];
  const numPages = typeof xPages === "string" ? Number(xPages) : 0;
  const nextPage = pages.length + 1;
  if (nextPage > numPages) return undefined;
  return nextPage;
}
