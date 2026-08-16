/**
 * Route prefixes crawlers are asked to stay out of.
 *
 * `robots.ts` publishes these as `Disallow` rules and `sitemap.ts` filters them
 * out of the sitemap. The two must agree: a URL that is advertised in the
 * sitemap *and* disallowed in robots.txt is a contradiction that Search Console
 * reports as an error, and it costs the whole sitemap credibility.
 *
 * Matching is by prefix — `/assets` also covers `/assets/character`.
 *
 * Most entries are here because the page renders nothing until a character is
 * logged in, so a crawler only ever sees an empty shell. Two are not:
 * `/travel` and `/ship-scanner` are anonymous, server-rendered, cacheable pages
 * that would rank on their own. They predate this list and are kept blocked to
 * preserve the existing robots.txt exactly; unblocking them is a deliberate SEO
 * decision, not a cleanup.
 */
export const CRAWLER_DISALLOWED_PATHS = [
  "/assets",
  "/calendar",
  "/contacts",
  "/debug",
  "/fittings",
  "/login",
  "/mail",
  "/notifications",
  "/settings",
  // Anonymous and indexable — blocked only for backwards compatibility.
  "/ship-scanner",
  "/skills",
  // Anonymous and indexable — blocked only for backwards compatibility.
  "/travel",
  "/wallet",
] as const;

/** Whether `route` may appear in the sitemap, i.e. robots.txt does not block it. */
export function isCrawlable(route: string): boolean {
  return !CRAWLER_DISALLOWED_PATHS.some(
    (prefix) => route === prefix || route.startsWith(`${prefix}/`),
  );
}
