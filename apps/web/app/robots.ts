import type { MetadataRoute } from "next";

import { CRAWLER_DISALLOWED_PATHS } from "~/config/seo.ts";
import { getSitemapUrls } from "./sitemap";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const sitemapUrls = await getSitemapUrls();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...CRAWLER_DISALLOWED_PATHS],
    },
    sitemap: sitemapUrls,
  };
}
