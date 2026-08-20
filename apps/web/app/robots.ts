import type { MetadataRoute } from "next";

import { CRAWLER_DISALLOWED_PATHS } from "~/config/seo.ts";
import { SITEMAP_INDEX_URL } from "./sitemap";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...CRAWLER_DISALLOWED_PATHS],
    },
    // One entry, not the enumerated pages: the index at /sitemap.xml expands to
    // every /sitemap/{n}.xml, so a new page needs no change here.
    sitemap: SITEMAP_INDEX_URL,
  };
}
