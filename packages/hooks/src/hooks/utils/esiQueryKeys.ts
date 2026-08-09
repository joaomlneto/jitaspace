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
 * Note the last two do *not* share an entry, so a component using both the
 * single-subject infinite hook and the multi-subject hook for the same endpoint
 * fetches that collection twice.
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
