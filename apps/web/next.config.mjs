import bundleAnalyzer from "@next/bundle-analyzer";
import withSerwistInit from "@serwist/next";

/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds and Linting.
 */
!process.env.SKIP_ENV_VALIDATION && (await import("./env.mjs"));

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
    "@jitaspace/sde-client",
    "@jitaspace/tiptap-eve",
    "@jitaspace/ui",
    "@jitaspace/utils",
  ],

  /** We already do linting and typechecking as separate tasks in CI */
  eslint: { ignoreDuringBuilds: !!process.env.CI },
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

  publicRuntimeConfig: {
    modifiedDate: new Date().toISOString(),
  },
};

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const withSerwist = withSerwistInit({
  // Note: If you use Pages Router, use something else that works, such as "service-worker/index.ts".
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
});

export default withBundleAnalyzer(withSerwist(config));
