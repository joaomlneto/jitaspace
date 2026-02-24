import type { MetadataRoute } from "next";

import { getSitemapUrls } from "./sitemap";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const sitemapUrls = await getSitemapUrls();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: sitemapUrls,
  };
}
