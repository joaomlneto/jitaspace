import { execSync } from "node:child_process";
import { withSentryConfig } from "@sentry/nextjs";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds and Linting.
 */
!process.env.SKIP_ENV_VALIDATION && (await jiti.import("./env"));

/**
 * Content-Security-Policy for the web app.
 *
 * IMPORTANT: this is shipped **report-only** — it is sent as the
 * `Content-Security-Policy-Report-Only` header (see `headers()` below), so the
 * browser reports violations WITHOUT blocking anything. This lets us observe
 * real-world violations against actual traffic before switching to an enforced
 * policy.
 *
 * Reports go to Sentry's Security ("CSP") endpoint, derived from the browser
 * DSN in `instrumentation-client.ts`. NOTE: this is deliberately NOT the
 * `/monitoring` route. That route is Sentry's envelope *tunnel* (`tunnelRoute`
 * below) — it only understands the SDK's envelope transport format and would
 * reject `application/csp-report` payloads, so browser CSP reports must be sent
 * to the Security endpoint directly. It is cross-origin, so ad-blockers may drop
 * a fraction of reports; acceptable for a report-only sampling phase. If we need
 * ad-blocker-resistant capture later, add a same-origin `/api/csp-report` route
 * that forwards to this endpoint.
 *
 * Path to an *enforced* policy (a separate, future task — do NOT enable here):
 *   1. Generate a per-request nonce in `middleware.ts`.
 *   2. Thread that nonce through every Next.js `<Script>` and inline `<style>`
 *      tag (e.g. `<Script nonce={nonce}>`, `<style nonce={nonce}>`).
 *   3. Replace `'unsafe-inline'` with `'nonce-<value>'` below, then rename the
 *      header from `Content-Security-Policy-Report-Only` to
 *      `Content-Security-Policy` (and drop `'unsafe-inline'`).
 *   4. Keep `connect-src` / `img-src` in sync as new external origins are added
 *      — the report-only phase exists precisely to surface anything missing
 *      before it can break a page.
 *
 * Origins allow-listed below are the ones the app legitimately talks to from the
 * browser:
 *   - img:     EVE image CDNs (`images.evetech.net`, `web.ccpgamescdn.com`) and
 *              the item-icon host (`iec.jita.space`).
 *   - script:  Google Tag Manager.
 *   - worker:  `blob:` for Sentry Session Replay's compression Web Worker.
 *   - connect: data the client-side hooks (React Query / SWR) fetch directly —
 *              the EVE data plane (ESI, the self-hosted SDE, the EVE-Kill / EVE
 *              Tycoon / Fuzzwork market APIs, and the zKillboard killmail API),
 *              `images.evetech.net` (also fetched as JSON to choose an image
 *              variant, so it's in `connect-src` as well as `img-src`), Google
 *              Analytics, and the same-origin Sentry (`/monitoring`) and Umami
 *              (`/analytics`) proxies. (`report-uri` is exempt from
 *              `connect-src`, so the Sentry ingest host isn't listed here.)
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  // Defense-in-depth (OWASP-recommended), both safe — the app uses neither a
  // `<base>` tag nor `<object>`/`<embed>`. `base-uri` can't be constrained by
  // any other directive, so pin it to block `<base href>` hijacking; `object-src
  // 'none'` shuts off legacy plugin embedding vectors.
  "base-uri 'self'",
  "object-src 'none'",
  "img-src 'self' https://images.evetech.net https://web.ccpgamescdn.com https://iec.jita.space data:",
  // FUTURE WORK: `'unsafe-inline'` is unavoidable here until we emit a
  // per-request nonce (Next.js injects inline bootstrap scripts; GTM is loaded
  // from googletagmanager.com). Removing it is the goal of the nonce migration
  // described above.
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  // Mantine emits inline styles; same per-request-nonce caveat as script-src.
  "style-src 'self' 'unsafe-inline'",
  // Sentry Session Replay (enabled in instrumentation-client.ts) compresses
  // events in a Web Worker loaded from a `blob:` URL. Without this it falls back
  // to default-src 'self', which blocks the blob worker.
  "worker-src 'self' blob:",
  // Browser-side data fetches (client-side React Query / SWR hooks): the EVE
  // data plane — ESI, self-hosted SDE, EVE-Kill / EVE Tycoon / Fuzzwork market,
  // and the zKillboard killmail API (kill page + Travel panel) — plus
  // images.evetech.net, which is also fetched as JSON to choose an image variant
  // and so needs connect-src in addition to img-src. Then Google Analytics
  // (incl. regional `*.google-analytics.com` collectors) and the same-origin
  // Sentry/Umami proxies.
  "connect-src 'self' https://esi.evetech.net https://sde.jita.space https://eve-kill.com https://evetycoon.com https://market.fuzzwork.co.uk https://images.evetech.net https://zkillboard.com https://www.google-analytics.com https://*.google-analytics.com /monitoring /analytics",
  "frame-ancestors 'none'",
  // Sentry Security (CSP) endpoint derived from the browser DSN — see the note
  // above on why this is NOT the `/monitoring` tunnel. TODO: `report-uri` is
  // deprecated in favour of the Reporting API (`Reporting-Endpoints` +
  // `report-to`); migrate when we move to an enforced policy.
  "report-uri https://o4507086334001152.ingest.de.sentry.io/api/4507086337540176/security/?sentry_key=8ce4a77ec56a1b9fa5c8081b394c3636",
].join("; ");

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
    "@jitaspace/eve-components",
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

  redirects: async () => [
    {
      // Deep-link to a specific tab on a type page: /type/<id>/<tab> sends the
      // browser to the canonical /type/<id>?tab=<tab>, which selects that tab.
      // Unrecognised tab names are harmless — the page falls back to Overview.
      source: "/type/:typeId/:tab",
      destination: "/type/:typeId?tab=:tab",
      permanent: false,
    },
  ],

  headers: async () => [
    {
      // Baseline hardening headers — safe to send on every response, including
      // /api/* (they don't constrain programmatic JSON consumers of the API).
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        // DENY (not SAMEORIGIN) to match the CSP `frame-ancestors 'none'` — the
        // app embeds none of its own pages in frames, so deny framing outright.
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
      ],
    },
    {
      // HSTS + CSP are browser-oriented directives that have no effect on
      // programmatic (non-browser) API consumers, so we scope them to page
      // routes and keep /api/* responses header-light. The negative lookahead
      // matches every path EXCEPT those starting with `api/` (it still matches
      // the site root `/` and all page routes).
      source: "/((?!api/).*)",
      headers: [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          // Report-only for now — see the `contentSecurityPolicy` doc comment
          // above for why and for the path to an enforced policy.
          key: "Content-Security-Policy-Report-Only",
          value: contentSecurityPolicy,
        },
      ],
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
