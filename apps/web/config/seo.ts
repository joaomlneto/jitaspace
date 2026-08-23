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
 * Every entry is here for the same reason: the page renders nothing until a
 * character is logged in, so a crawler only ever sees an empty shell. Anything
 * that renders for an anonymous visitor does not belong here — `/travel` and
 * `/ship-scanner` used to be listed despite being fully anonymous, cacheable,
 * server-rendered pages, which kept them out of search for no benefit.
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
  "/skills",
  "/wallet",
] as const;

/** Whether `route` may appear in the sitemap, i.e. robots.txt does not block it. */
export function isCrawlable(route: string): boolean {
  return !CRAWLER_DISALLOWED_PATHS.some(
    (prefix) => route === prefix || route.startsWith(`${prefix}/`),
  );
}
