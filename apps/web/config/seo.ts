/**
 * Route prefixes crawlers are asked to stay out of: pages that only render
 * anything once a character is logged in (a crawler sees an empty shell), plus
 * the debug tooling.
 *
 * `robots.ts` publishes these as `Disallow` rules and `sitemap.ts` filters them
 * out of the sitemap. The two must agree: a URL that is advertised in the
 * sitemap *and* disallowed in robots.txt is a contradiction that Search Console
 * reports as an error, and it costs the whole sitemap credibility.
 *
 * Matching is by prefix — `/assets` also covers `/assets/character`.
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
  "/ship-scanner",
  "/skills",
  "/travel",
  "/wallet",
] as const;

/** Whether `route` may appear in the sitemap, i.e. robots.txt does not block it. */
export function isCrawlable(route: string): boolean {
  return !CRAWLER_DISALLOWED_PATHS.some(
    (prefix) => route === prefix || route.startsWith(`${prefix}/`),
  );
}
