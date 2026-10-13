import type { MetadataRoute } from "next";

import { CRAWLER_DISALLOWED_PATHS } from "~/config/seo.ts";
import { SITEMAP_INDEX_URL } from "./sitemap";

/**
 * Seconds AhrefsBot is asked to wait between requests. It honours
 * `Crawl-delay`; 10 is the slowest pace it takes at face value.
 */
const AHREFS_CRAWL_DELAY_SECONDS = 10;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...CRAWLER_DISALLOWED_PATHS],
      },
      // Meta's AI-training crawler. It made ~1.2M requests in 30 days — a fifth
      // of all CDN traffic — and every request is a billed edge request. Link
      // previews on Facebook, Messenger and Instagram come from a different
      // agent (`facebookexternalhit`), so this does not break them.
      {
        userAgent: "meta-externalagent",
        disallow: "/",
      },
      // An SEO tool's crawler: slowed rather than blocked. A crawler obeys only
      // the most specific group that names it, so the `*` disallow list has to
      // be repeated here or AhrefsBot would be let into the logged-in pages.
      {
        userAgent: "AhrefsBot",
        allow: "/",
        disallow: [...CRAWLER_DISALLOWED_PATHS],
        crawlDelay: AHREFS_CRAWL_DELAY_SECONDS,
      },
    ],
    // One entry, not the enumerated pages: the index at /sitemap.xml expands to
    // every /sitemap/{n}.xml, so a new page needs no change here.
    sitemap: SITEMAP_INDEX_URL,
  };
}
