import bundleAnalyzer from "@next/bundle-analyzer";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds and Linting.
 */
!process.env.SKIP_ENV_VALIDATION && (await jiti.import("./env"));

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,

  /** Enables hot reloading for local packages without a build step */
  transpilePackages: [
    "@jitaspace/auth",
    "@jitaspace/db",
    "@jitaspace/esi-metadata",
    "@jitaspace/esi-client",
    "@jitaspace/esi-meta-client",
    "@jitaspace/eve-icons",
    "@jitaspace/eve-scrape",
    "@jitaspace/hooks",
    "@jitaspace/kv",
    "@jitaspace/sde-client",
    "@jitaspace/tiptap-eve",
    "@jitaspace/ui",
    "@jitaspace/utils",
  ],

  /** We already do typechecking as separate tasks in CI */
  typescript: { ignoreBuildErrors: !!process.env.CI },

  /** Allow images from CCP CDN */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "web.ccpgamescdn.com",
      },
      {
        protocol: "https",
        hostname: "images.evetech.net",
      },
    ],
  },

  rewrites: async () => [
    {
      source: "/analytics/:match*",
      destination: "https://analytics.umami.is/:match*", // Proxy to Umami
    },
  ],

  env: {
    NEXT_PUBLIC_MODIFIED_DATE: new Date().toISOString(),
  },
};

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer(config);
