import { env } from "~/env";

/**
 * When a page last changed — the shared answer for sitemaps, `<meta>` tags and
 * anything else that needs to tell a crawler or a reader how fresh a page is.
 *
 * There are two distinct sources of truth and using the wrong one is the bug
 * this module exists to prevent:
 *
 * - **Source-tree content** (static pages, layouts, copy) changes when the code
 *   changes → {@link BUILD_LAST_MODIFIED}.
 * - **Database-backed content** (a type, a region, an LP store) changes when its
 *   row changes → that row's own `updatedAt`, normalized by
 *   {@link lastModifiedOf}.
 *
 * Reporting the build date for database-backed pages — which the sitemap did
 * until now — tells crawlers that all ~50,000 item pages changed on every
 * deploy. That burns crawl budget on unchanged pages and devalues the signal for
 * the pages that genuinely did change.
 */

/**
 * The commit date of `HEAD`, captured at build time by `getModifiedDate()` in
 * `next.config.mjs` (which falls back to the build clock outside a git
 * checkout). Client-safe: `NEXT_PUBLIC_MODIFIED_DATE` is in the client schema.
 *
 * Read through {@link lastModifiedOf} rather than parsed inline, so a malformed
 * value degrades the same way everywhere instead of producing an `Invalid Date`
 * that serializes as the string "Invalid Date".
 */
export const BUILD_LAST_MODIFIED: Date = parseDate(
  env.NEXT_PUBLIC_MODIFIED_DATE,
);

/**
 * Anything that can stand in for a timestamp here, including "not recorded".
 *
 * Wide on purpose: callers pass a Prisma `DateTime` (a `Date`), an ISO string
 * from an env var or an API, or `null` from a nullable column — and the point
 * of this module is that all of them normalize the same way.
 */
export type LastModifiedInput = Date | string | number | null | undefined;

function parseDate(value: LastModifiedInput): Date {
  if (value === null || value === undefined) return new Date();
  const parsed = value instanceof Date ? value : new Date(value);
  // `new Date("nonsense")` yields an Invalid Date, whose getTime() is NaN and
  // whose toISOString() throws — neither is something to put in a sitemap.
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * A row's `updatedAt` as a usable date, falling back to the build date when the
 * row has none.
 *
 * Nullable is the common case, not an edge case: `updatedAt` is populated by
 * Prisma's `@updatedAt`, but a `groupBy` `_max` over an empty group yields
 * null, and older rows predate the column on some tables.
 */
export function lastModifiedOf(value: LastModifiedInput): Date {
  if (value === null || value === undefined) return BUILD_LAST_MODIFIED;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? BUILD_LAST_MODIFIED : parsed;
}

/**
 * The most recent of several timestamps — for a page assembled from many rows,
 * or a sitemap page summarizing the URLs it contains.
 *
 * An empty input is the build date, not the epoch: "nothing here has a date"
 * means "as old as the deployment", never 1970.
 */
export function latestLastModified(values: Iterable<LastModifiedInput>): Date {
  let newest: Date | undefined;
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) continue;
    if (!newest || parsed > newest) newest = parsed;
  }
  return newest ?? BUILD_LAST_MODIFIED;
}
