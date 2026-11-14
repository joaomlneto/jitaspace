import type { MetadataRoute } from "next";

import { CRAWLER_DISALLOWED_PATHS } from "~/config/seo.ts";
import { SITEMAP_INDEX_URL } from "./sitemap";

/**
 * Seconds AhrefsBot is asked to wait between requests. It honours
 * `Crawl-delay`; 10 is the slowest pace it takes at face value.
 */
const AHREFS_CRAWL_DELAY_SECONDS = 10;

/**
 * The generated OpenGraph card. Each card is rendered on demand for one page,
 * so a crawler walking the site makes the server draw an image nobody will
 * look at: in the week to 2026-11-14, 31k of the 31.4k cards rendered went to
 * the crawlers named below, and only 86 requests were served from the cache.
 *
 * It is not in `CRAWLER_DISALLOWED_PATHS` on purpose: link previews (X obeys
 * robots.txt for its cards) and search engines still need the image.
 */
const OG_IMAGE_PATH = "/api/og";

/** Crawlers that fetch every page's card image and have no use for it. */
const OG_IMAGE_CRAWLERS = [
  "PerplexityBot",
  "ExaSearchBot",
  "ExaSearchBot-Images",
];

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
        disallow: [...CRAWLER_DISALLOWED_PATHS, OG_IMAGE_PATH],
        crawlDelay: AHREFS_CRAWL_DELAY_SECONDS,
      },
      // Search crawlers that stay welcome on the pages but are kept off the
      // card images. As above, each group repeats the `*` disallow list.
      ...OG_IMAGE_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: [...CRAWLER_DISALLOWED_PATHS, OG_IMAGE_PATH],
      })),
    ],
    // One entry, not the enumerated pages: the index at /sitemap.xml expands to
    // every /sitemap/{n}.xml, so a new page needs no change here.
    sitemap: SITEMAP_INDEX_URL,
  };
}
