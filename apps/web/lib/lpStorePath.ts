/**
 * The one URL an LP store lives at: `/lp-store/State_Protectorate`.
 *
 * The `/lp-store/[corporationId]` segment accepts either a corporation id or
 * an underscored name, so every store is reachable at two URLs. The index
 * linked stores by name while the sitemap advertised them by id and the page
 * titled and canonicalised only the id form — so the URL the site linked to
 * rendered with the bare site title and no canonical, and Google saw two
 * copies of each store with nothing saying which one was real. The name is
 * the address people read, share and search for, so it is the canonical; the
 * index link, the sitemap and the page's `alternates.canonical` all build it
 * here so they cannot disagree again.
 *
 * Pure (no server imports): the `/lp-store` index is a Client Component.
 */

/**
 * The path segment for a store — spaces become underscores, and anything that
 * is not safe in a path segment is percent-encoded.
 *
 * Today's NPC corporation names only need the underscores (`Mordu's_Legion`,
 * `Eifyr_and_Co.` and `Kor-Azor_Family` are all left as-is), but a name with a
 * `/`, `?`, `#` or `&` would otherwise split the path or truncate the URL.
 * Next decodes the segment before the page sees it, so the round trip through
 * `corporationNameFromLpStoreSegment` is lossless as long as no corporation
 * name contains a literal underscore — none does.
 */
export function lpStoreSegment(corporationName: string): string {
  return encodeURIComponent(corporationName.replaceAll(" ", "_"));
}

/** The canonical path of a store: `/lp-store/<segment>`. */
export function lpStorePath(corporationName: string): string {
  return `/lp-store/${lpStoreSegment(corporationName)}`;
}

/** The corporation name an (already decoded) `/lp-store/<segment>` names. */
export function corporationNameFromLpStoreSegment(segment: string): string {
  return segment.replaceAll("_", " ");
}
