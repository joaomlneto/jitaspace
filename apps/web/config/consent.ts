"use client";

import { ConsentManagerOptions } from "@c15t/nextjs";
import { gtag } from "@c15t/scripts/google-tag";

import { env } from "~/env.ts";

export const CONSENT_OPTIONS: ConsentManagerOptions & {
  mode: "offline";
} = {
  enabled: false,
  mode: "offline",
  legalLinks: {
    cookiePolicy: {
      target: "_blank",
      href: "/cookie-policy",
      rel: "noopener noreferrer",
      label: "Cookie Policy",
    },
  },
  consentCategories: ["necessary", "measurement"],
  ignoreGeoLocation: env.NODE_ENV === "development",
  react: {
    colorScheme: "dark",
  },
  scripts: [
    gtag({
      id: env.NEXT_PUBLIC_GOOGLE_TAG_ID!,
      category: "measurement",
    }),
    {
      id: "umami",
      src: "/analytics/script.js",
      category: "measurement",
      async: true,
      defer: true,
      attributes: {
        "data-website-id": env.NEXT_PUBLIC_UMAMI_WEBSITE_ID!,
        "data-domains": "www.jita.space",
        strategy: "afterInteractive",
      },
    },
  ],
};
