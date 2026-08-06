/**
 * Marker appended to an infinite query's key so it cannot share a cache entry
 * with the single-page query for the same endpoint.
 */
export const INFINITE_QUERY_KEY_MARKER = "infinite";

/**
 * Distinguish an infinite query's cache entry from the single-page one.
 *
 * Kubb generates the two key functions identically — for example both
 * `getCorporationsCorporationIdAssetsQueryKey` and
 * `...InfiniteQueryKey` produce
 * `[{ url: '/corporations/:corporation_id/assets', params: { corporation_id } }]`
 * plus the query params if any were passed. So the infinite call sites only
 * avoided colliding because each happened to pass `{}` as `params`, which
 * appends a trailing `{}` to the key.
 *
 * That is an accident, not a design: dropping the `{}` — a reasonable-looking
 * cleanup, since none of these call sites actually want query params — would
 * make the two keys identical. One entry holds `InfiniteData` (`{ pages }`)
 * and the other a flat `ResponseConfig`, so whichever query mounted first
 * would win and the other would read the wrong shape. The failure is not
 * type-checked and not obviously related to the edit that caused it:
 * `data?.pages.flat()` throws, because the optional chain guards `data`, not
 * `pages`.
 *
 * Appending an explicit marker makes the separation intentional and
 * independent of the `params` argument.
 */
export function esiInfiniteQueryKey(
  generatedKey: readonly unknown[],
): readonly unknown[] {
  return [...generatedKey, INFINITE_QUERY_KEY_MARKER];
}
