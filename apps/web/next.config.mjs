import { execSync } from "node:child_process";
import { withSentryConfig } from "@sentry/nextjs";
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
  cacheComponents: true,

  /** Enables hot reloading for local packages without a build step */
  transpilePackages: [
    "@jitaspace/auth",
    "@jitaspace/datatable",
    "@jitaspace/datatable-mantine",
    "@jitaspace/datatable-tanstack",
    "@jitaspace/db",
    "@jitaspace/esi-metadata",
    "@jitaspace/esi-client",
    "@jitaspace/eve-icons",
    "@jitaspace/eve-scrape",
    "@jitaspace/hooks",
    "@jitaspace/kv",
    "@jitaspace/sde-client",
    "@jitaspace/tiptap-eve",
    "@jitaspace/ui",
    "@jitaspace/utils",
  ],

  /** Avoid bundling server-only worker dependencies */
  serverExternalPackages: [
    "bull",
    "@chat-adapter/discord",
    "discord.js",
    "@discordjs/ws",
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
    {
      // Serve a single static shell for every /market/<typeId> URL instead of
      // rendering (and ISR-caching) one page per type id. The browser keeps the
      // pretty /market/<typeId> URL; the client reads the id from the path.
      source: "/market/:typeId",
      destination: "/market",
    },
  ],

  env: {
    NEXT_PUBLIC_MODIFIED_DATE: getModifiedDate(),
  },
};

/**
 * Timestamp surfaced as "Website Updated On" on the status page.
 *
 * Derived from the deployed commit's git committer date rather than
 * `new Date()`. A wall-clock timestamp is non-deterministic, so Turborepo /
 * Vercel build caching would restore a previously-built `.next` artifact — with
 * its stale inlined date — on every cache hit, and `next build` (hence this
 * file) never re-runs to refresh it. The commit date is stable per revision, so
 * it only moves when the site's code actually changed. Falls back to wall-clock
 * time when git isn't available (e.g. some local shells).
 */
function getModifiedDate() {
  try {
    const iso = execSync("git show -s --format=%cI HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (iso) return new Date(iso).toISOString();
  } catch {
    // git unavailable or not a checkout — fall back below.
  }
  return new Date().toISOString();
}

export default withSentryConfig(config, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "jitaspace",

  project: "jitaspace",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: false,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
