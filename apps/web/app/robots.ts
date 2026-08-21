import type { MetadataRoute } from "next";

import { CRAWLER_DISALLOWED_PATHS } from "~/config/seo.ts";
import { FIRST_SITEMAP_PAGE_URL, SITEMAP_INDEX_URL } from "./sitemap";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...CRAWLER_DISALLOWED_PATHS],
    },
    // The index expands to every /sitemap/{n}.xml, so adding a page needs no
    // change here. Page 0 is listed beside it deliberately, as insurance.
    //
    // The index only answers at /sitemap.xml through a `beforeFiles` rewrite in
    // next.config.mjs, and nothing verifies that end to end: Cypress boots the
    // server but never requests it, the jest tests call the route handler
    // directly, and Vercel resolves `beforeFiles` in its own routing layer
    // rather than Next's. If that rewrite ever fails to survive the Build
    // Output API, the index 404s — and without this second entry, nothing would
    // point a crawler at the sitemap at all, which is worse than the broken
    // state this replaced. Page 0 always serves, so it degrades instead.
    //
    // REMOVE THIS ENTRY once https://www.jita.space/sitemap.xml is confirmed
    // serving <sitemapindex> in production, together with the ordering
    // assertion in tests/sitemap.test.ts. Until then it is load-bearing; after
    // that it is only a puzzle.
    sitemap: [SITEMAP_INDEX_URL, FIRST_SITEMAP_PAGE_URL],
  };
}
