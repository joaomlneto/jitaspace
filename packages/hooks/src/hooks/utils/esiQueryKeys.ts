/**
 * Markers that keep a query's cache entry separate from the generated
 * single-page one for the same endpoint.
 *
 * Kubb emits both key functions for an endpoint identically — for example
 * `getCorporationsCorporationIdAssetsQueryKey` and `...InfiniteQueryKey` each
 * produce `[{ url, params }]` plus any query params — so nothing distinguishes
 * the entries on its own. Without a marker, whichever query mounts first wins
 * and the other reads its data in the wrong shape.
 *
 * The values differ because these really are different resources for the same
 * endpoint, not different spellings of one:
 *
 * - unmarked — a single page, what the generated hooks fetch
 * - `infinite` — react-query `InfiniteData`, paged on demand
 * - `all-pages` — the whole collection resolved by one query
 *
 * The last two do *not* share an entry, so a component using both the
 * single-subject infinite hook and the multi-subject hook for the same endpoint
 * fetches that collection twice. That is deliberate rather than an oversight,
 * and converging them would be a regression: an infinite query re-renders as
 * each page lands, which is what lets the assets table appear after page one
 * and fill in — `esiPagedQueryOptions` resolves only once every page is in, so
 * the same screen would stay blank until the last one. If a page needs both
 * shapes, pick one rather than mounting both.
 */
export const ESI_QUERY_KEY_MARKER = {
  infinite: "infinite",
  allPages: "all-pages",
} as const;

export type EsiQueryKeyMarker =
  (typeof ESI_QUERY_KEY_MARKER)[keyof typeof ESI_QUERY_KEY_MARKER];

/** Append a marker to a generated query key. */
export function markEsiQueryKey(
  generatedKey: readonly unknown[],
  marker: EsiQueryKeyMarker,
): readonly unknown[] {
  return [...generatedKey, marker];
}

/**
 * Distinguish an infinite query's cache entry from the single-page one.
 *
 * The infinite call sites previously avoided colliding only because each
 * happened to pass `{}` as `params`, which appends a trailing `{}` to the key —
 * an accident rather than a design, and one a reasonable-looking cleanup would
 * have undone. Marking makes the separation intentional and independent of the
 * `params` argument.
 */
export function esiInfiniteQueryKey(
  generatedKey: readonly unknown[],
): readonly unknown[] {
  return markEsiQueryKey(generatedKey, ESI_QUERY_KEY_MARKER.infinite);
}
