import withPWAInit from "@ducanh2912/next-pwa";
import bundleAnalyzer from "@next/bundle-analyzer";

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
    "jotai-devtools",
    "@jitaspace/auth",
    "@jitaspace/db",
    "@jitaspace/esi-client-kubb",
    "@jitaspace/esi-hooks",
    "@jitaspace/esi-meta-client",
    "@jitaspace/eve-icons",
    "@jitaspace/eve-scrape",
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

  async redirects() {
    return [
      {
        source: "/bookmarks",
        //destination: 'https://github.com/esi/esi-issues/issues/1340',
        destination: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        permanent: false,
      },
    ];
  },

  experimental: {
    swcPlugins: [["@swc-jotai/react-refresh", {}]],
  },
};

const withPWA = withPWAInit({
  dest: "public",
});

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer(withPWA(config));
