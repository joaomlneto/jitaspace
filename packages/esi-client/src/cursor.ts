import type { ResponseConfig } from "./client";

/**
 * ESI's newer collections (military campaigns, freelance jobs, …) page with an
 * opaque cursor instead of `page` + `x-pages`. Each response carries
 * `cursor.before`, which walks back in time; a request without one starts from
 * the most recent records, and the walk is over when a page comes back empty.
 */
export interface EsiCursor {
  before?: string;
  after?: string;
}

/** ESI's own upper bound for `limit` on these endpoints. */
export const ESI_CURSOR_PAGE_LIMIT = 100;

/**
 * Hard ceiling on requests per walk.
 *
 * At {@link ESI_CURSOR_PAGE_LIMIT} records a page that is 10,000 records,
 * far beyond anything these endpoints hold today (a military campaign has
 * ~44 objectives). Reaching it means the cursor is not advancing as
 * documented, so the walk refuses rather than spin against the rate limit.
 */
export const MAX_ESI_CURSOR_PAGES = 100;

/**
 * Thrown when a cursor walk does not end within {@link MAX_ESI_CURSOR_PAGES}.
 *
 * Throwing rather than returning what was collected so far: a truncated
 * collection would look complete.
 */
export class EsiCursorCeilingError extends Error {
  constructor() {
    super(
      `ESI cursor did not run out within ${MAX_ESI_CURSOR_PAGES} pages. Refusing rather than returning a partial collection that would look complete.`,
    );
    this.name = "EsiCursorCeilingError";
  }
}

/**
 * Walk a cursor-paginated ESI collection to its start and return every record
 * as one response, shaped like a single-page one (the first page's status and
 * headers, the concatenated items as `data`).
 *
 * Pages are fetched one after another: each request needs the cursor the
 * previous one returned, so there is nothing to parallelise.
 *
 * @param fetchPage - fetch one page; `before` is undefined for the first.
 * @param itemsOf - extract the records from a page's body.
 */
export async function fetchAllEsiCursorPages<
  TPage extends { cursor?: EsiCursor },
  TItem,
>(
  fetchPage: (before: string | undefined) => Promise<ResponseConfig<TPage>>,
  itemsOf: (page: TPage) => TItem[],
): Promise<ResponseConfig<TItem[]>> {
  const first = await fetchPage(undefined);
  const items = [...itemsOf(first.data)];
  let page = first;
  const seen = new Set<string>();

  for (let requests = 1; ; requests++) {
    const before = page.data.cursor?.before;
    // No records, no cursor, or a cursor that does not move: nothing older.
    if (itemsOf(page.data).length === 0 || !before || seen.has(before)) break;
    if (requests >= MAX_ESI_CURSOR_PAGES) throw new EsiCursorCeilingError();
    seen.add(before);
    page = await fetchPage(before);
    items.push(...itemsOf(page.data));
  }

  return { ...first, data: items };
}
