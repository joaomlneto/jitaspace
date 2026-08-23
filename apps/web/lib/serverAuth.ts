import type { NextRequest } from "next/server";

import { CONFIG } from "~/config/constants";
import { env } from "~/env";

// Re-exported from a client-safe module so this server helper and the client
// login/complete page share one open-redirect guard implementation.
export { sanitizeReturnTo } from "./returnTo";

/**
 * Origin used when the request arrives on a host we do not recognise, and when
 * `NEXT_PUBLIC_SITE_URL` is unset or unparseable. Mirrors the default in
 * `~/config/constants` (and `app/layout.tsx`) so a misconfigured deployment
 * still lands on the real site rather than on nothing.
 */
const DEFAULT_SITE_ORIGIN = "https://www.jita.space";

/**
 * A bare hostname, optionally with a port: DNS labels or a bracketed IPv6
 * literal. Anything else — userinfo (`jita.space@evil.example`), a path, a
 * comma, whitespace, control characters — is rejected before the value is used
 * as a lookup key, so a header can never smuggle a second host past the
 * allow-list.
 */
const HOST_WITH_OPTIONAL_PORT =
  /^(?:[a-z0-9-]+(?:\.[a-z0-9-]+)*\.?|\[[0-9a-f:]+\])(?::\d{1,5})?$/;

/**
 * Accepted on any port while `NODE_ENV !== "production"`: `next dev` binds to
 * whatever port is free, so the dev origin cannot be enumerated ahead of time.
 * A production build served on loopback (or a LAN IP) must set
 * `NEXT_PUBLIC_SITE_URL` or `AUTH_TRUSTED_ORIGINS` instead.
 */
const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

interface TrustedOrigins {
  /** Where an unrecognised host is sent. Always an origin we control. */
  canonical: string;
  /** Normalised `host[:port]` → the full origin (scheme included) we serve it on. */
  byHost: ReadonlyMap<string, string>;
  allowLoopback: boolean;
}

let trustedOriginsCache: TrustedOrigins | null = null;

/**
 * Normalise a host header value into the key used for allow-list lookups, or
 * `null` when it is not a plain host.
 *
 * Normalisation exists so equivalent spellings of a host we do serve still
 * match exactly: case, the FQDN trailing dot (`jita.space.`), and an explicit
 * default port (`jita.space:443`, which browsers omit). None of it can widen
 * the allow-list — a value that normalises to a host we did not configure is
 * still rejected.
 */
function normalizeHostKey(value: string | null | undefined): string | null {
  if (!value) return null;
  // A comma means the value passed through more than one proxy; the leftmost
  // element is the one the client supplied, so validate that.
  const candidate = (value.split(",")[0] ?? "").trim().toLowerCase();
  // 253 is the maximum length of a DNS name; the port adds at most 6.
  if (candidate.length === 0 || candidate.length > 259) return null;
  const withoutTrailingDot = candidate.replace(/\.(?=$|:)/, "");
  if (!HOST_WITH_OPTIONAL_PORT.test(withoutTrailingDot)) return null;
  // The regex allows up to five digits, which still admits values above the
  // 65535 maximum. Those reach `loopbackOrigin()` in development and produce an
  // origin `new URL()` rejects, turning a bogus header into a 500 on the auth
  // routes rather than the intended fallback.
  const port = /:(\d+)$/.exec(withoutTrailingDot)?.[1];
  if (port !== undefined && Number(port) > 65535) return null;
  return withoutTrailingDot.replace(/:(?:80|443)$/, "");
}

/**
 * Parse a configured origin. Accepts a full origin (`https://www.jita.space`)
 * as well as the bare hostname Vercel's system env vars carry
 * (`jita-space-abc123.vercel.app`), which is always reached over https.
 */
function toOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  try {
    const url = new URL(
      trimmed.includes("://") ? trimmed : `https://${trimmed}`,
    );
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    // Credentials in a redirect target are a phishing vector on their own.
    if (url.username.length > 0 || url.password.length > 0) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * The apex/www sibling of a configured origin.
 *
 * `jita.space` and `www.jita.space` are the same deployment — DNS points both
 * at this app — but only one of them can be the canonical
 * `NEXT_PUBLIC_SITE_URL`. Deriving the sibling keeps a visitor who typed the
 * other one on the host they are actually browsing: rewriting them mid-login
 * would change the OAuth `redirect_uri` away from the one the flow started
 * with, and would drop the flow cookie set on the other host.
 *
 * Only the `www.` label is derived, and only for a registrable domain — this
 * is deliberately not "any subdomain of jita.space". Every other host (staging,
 * a custom domain, a tunnel) must be listed in `AUTH_TRUSTED_ORIGINS`.
 */
function siblingOrigin(origin: string): string | null {
  const url = new URL(origin);
  if (url.hostname.startsWith("www.")) {
    url.hostname = url.hostname.slice("www.".length);
    return url.origin;
  }
  // Prefixing `www.` onto `preview.jita.space` or an IP literal would invent a
  // host we do not serve, so require a bare `label.tld`.
  if (/^[a-z0-9-]+\.[a-z]{2,}$/.test(url.hostname)) {
    url.hostname = `www.${url.hostname}`;
    return url.origin;
  }
  return null;
}

/**
 * Hosts are matched against this allow-list exactly; nothing here is a pattern.
 * Suffix matching is the classic origin-check bug — `endsWith("jita.space")`
 * also accepts `evil-jita.space`, and even the label-safe `.jita.space` form
 * would hand every present and future subdomain (including one lost to a
 * dangling DNS record) the ability to receive an OAuth callback.
 *
 * Vercel preview deployments are covered by the system env vars below rather
 * than by a `*.vercel.app` rule, which would trust every other tenant on that
 * domain.
 */
function buildTrustedOrigins(): TrustedOrigins {
  const byHost = new Map<string, string>();

  const add = (value: string | undefined | null): void => {
    if (!value) return;
    const origin = toOrigin(value);
    if (!origin) {
      console.warn(
        `Ignoring malformed trusted origin: ${JSON.stringify(value.slice(0, 100))}`,
      );
      return;
    }
    const key = normalizeHostKey(new URL(origin).host);
    if (!key) {
      // Parses as a URL but its host is not one we can key on (an out-of-range
      // port, say). Warn rather than drop it silently — the symptom would
      // otherwise be logins mysteriously bouncing to the canonical origin.
      console.warn(
        `Ignoring trusted origin with an unusable host: ${JSON.stringify(origin)}`,
      );
      return;
    }
    // First writer wins, so the canonical origin keeps precedence over a later
    // entry for the same host.
    if (!byHost.has(key)) byHost.set(key, origin);
  };

  const canonical = toOrigin(CONFIG.SITE_URL) ?? DEFAULT_SITE_ORIGIN;
  add(canonical);
  add(siblingOrigin(canonical));

  // Vercel system env vars, set at runtime on every deployment. A preview's own
  // hostname is not knowable at build time, so this is the only way previews
  // can serve their own origin instead of bouncing to production.
  add(env.VERCEL_PROJECT_PRODUCTION_URL);
  add(env.VERCEL_BRANCH_URL);
  add(env.VERCEL_URL);

  // Escape hatch for anything not derivable: extra domains, a preview alias, a
  // LAN address or tunnel used during development.
  for (const entry of (env.AUTH_TRUSTED_ORIGINS ?? "").split(",")) {
    if (entry.trim().length > 0) add(entry);
  }

  return {
    canonical,
    byHost,
    allowLoopback: env.NODE_ENV !== "production",
  };
}

function getTrustedOrigins(): TrustedOrigins {
  // Every input is process configuration, fixed for the lifetime of the server,
  // so this is built once on the first request rather than on every one.
  trustedOriginsCache ??= buildTrustedOrigins();
  return trustedOriginsCache;
}

/**
 * The dev-server origin for a loopback host. The protocol comes from the URL
 * Next.js parsed, never from `x-forwarded-proto`: that header decides whether
 * callers mark the OAuth cookies `Secure` (and use the `__Host-` prefix), so
 * letting a request downgrade it would be a real weakness rather than a
 * cosmetic one.
 */
function loopbackOrigin(hostKey: string, req: NextRequest): string | null {
  const hostname = hostKey.replace(/:\d+$/, "");
  if (!LOOPBACK_HOSTNAMES.has(hostname)) return null;
  const protocol = req.nextUrl.protocol === "https:" ? "https" : "http";
  return `${protocol}://${hostKey}`;
}

/**
 * Resolve the externally-visible origin of the request. Used to build the OAuth
 * `redirect_uri` and same-origin redirects — including the provider-error
 * redirect in the callback route, which runs before any cookie or state check
 * and would otherwise be an unauthenticated open redirect.
 *
 * `x-forwarded-host` (which Vercel's proxy sets), the `Host` header and
 * `req.nextUrl` are all ultimately request-controlled, so each is used only as
 * a *lookup key* into the allow-list; the returned string always comes from
 * configuration. An unrecognised host falls back to the canonical origin rather
 * than throwing: this runs on user-facing GET routes, where a 500 would turn a
 * spoofed header into an outage, and the security property is the same — the
 * response never carries an origin we were not configured with.
 */
export function getRequestOrigin(req: NextRequest): string {
  const trusted = getTrustedOrigins();
  const candidates = [
    req.headers.get("x-forwarded-host"),
    req.headers.get("host"),
    req.nextUrl.host,
  ];

  for (const candidate of candidates) {
    const key = normalizeHostKey(candidate);
    if (!key) continue;
    const configured = trusted.byHost.get(key);
    if (configured) return configured;
    const loopback = trusted.allowLoopback ? loopbackOrigin(key, req) : null;
    if (loopback) return loopback;
  }

  console.warn(
    `Untrusted request host ${JSON.stringify(
      (candidates.find(Boolean) ?? "").slice(0, 100),
    )}; falling back to ${trusted.canonical}`,
  );
  return trusted.canonical;
}
