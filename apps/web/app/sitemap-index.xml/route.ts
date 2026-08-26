import { connection } from "next/server";

import { getSitemapPages } from "../sitemap";

/**
 * The sitemap index, served at `/sitemap.xml` via a `beforeFiles` rewrite in
 * `next.config.mjs`.
 *
 * It cannot live at `app/sitemap.xml/route.ts`: Next reserves `/sitemap.xml`
 * for the `app/sitemap.ts` metadata convention and fails the whole app with
 * "Conflicting route and metadata at /sitemap.xml" — even though that reserved
 * route only ever 404s once `generateSitemaps()` moves the real pages to
 * `/sitemap/{n}.xml`. The rewrite has to be `beforeFiles` for the same reason:
 * afterFiles would lose to the reserved route and keep serving the 404.
 *
 * Why bother: `/sitemap.xml` is the path crawlers probe unprompted, and until
 * now it 404'd, so the numbered pages were reachable only via robots.txt.
 *
 * Built from the same assembled list that robots.txt advertises, so index,
 * robots.txt and the servable pages cannot disagree about how many exist — and
 * each entry carries the newest `<lastmod>` on that page rather than the deploy
 * date, so a crawler can skip pages that have not changed.
 */

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

// The origin comes from NEXT_PUBLIC_SITE_URL, so it is not structurally
// guaranteed to be XML-safe even though the paths appended to it are numeric.
const escapeXml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => XML_ESCAPES[char] ?? char);

export async function GET(): Promise<Response> {
  // Request-time, not build-time: the page count comes from the database, which
  // is unreachable during the CI build. `connection()` is the
  // `cacheComponents`-blessed opt-out — `export const dynamic` is disallowed.
  await connection();

  const entries = (await getSitemapPages())
    .map(
      ({ url, lastModified }) =>
        `  <sitemap>\n    <loc>${escapeXml(url)}</loc>\n    <lastmod>${lastModified.toISOString()}</lastmod>\n  </sitemap>`,
    )
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>\n`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Matches the one-hour URL cache in ./sitemap.ts — the index only changes
      // when the page count crosses a 50,000-URL boundary.
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
