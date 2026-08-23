import { createHash } from "node:crypto";

/**
 * Redaction rules for the /debug environment table.
 *
 * These live in their own module (rather than in `page.tsx`) for two reasons:
 * they can be unit tested without rendering the page or mocking `~/env`,
 * `~/lib/db`, `~/lib/kv` and `next/*`; and `page.tsx` keeps to the exports
 * Next.js expects from a route file.
 *
 * Server-only by construction: `page.tsx` redacts before building the props it
 * hands to the Client Component, because every prop crossing that boundary is
 * serialized into the RSC flight payload and reaches the browser whether or not
 * anything renders it.
 */

/**
 * Environment variables whose plaintext value is safe to show in the browser.
 *
 * `NEXT_PUBLIC_*` vars are inlined into the client bundle by Next.js, so they
 * are already readable there and are matched by prefix in `classifyEnvVar()`
 * instead of being listed here. `EVE_CLIENT_ID` is an OAuth2 client
 * identifier: it travels in the SSO authorize URL the browser is redirected
 * to, so it is public by construction.
 *
 * The classifier is deliberately fail-closed — anything not matched here or by
 * the connection-string rule is fingerprinted — so adding a new secret to the
 * `rawVars` map in `page.tsx` can never leak it by omission. Treat this set as
 * security-relevant config and review additions to it as such.
 */
const PUBLIC_ENV_VARS = new Set([
  "NODE_ENV",
  "NEXT_RUNTIME",
  "EVE_CLIENT_ID",
  "SKIP_BUILD_STATIC_GENERATION",
  "HISTORY_DATABASE_SCHEMA",
  "AUTH_TRUSTED_ORIGINS",
  // Vercel system vars: bare hostnames of this deployment, not credentials.
  // Listed here (rather than treated as connection strings) because they carry
  // no scheme and so do not parse as URLs.
  "VERCEL_URL",
  "VERCEL_BRANCH_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
]);

/**
 * Vars vetted as connection strings, where showing the host and database name
 * is worth more than it costs. An explicit list rather than an
 * `endsWith("_URL")` rule: for a webhook-style URL the secret *is* the path, so
 * a suffix rule would be fail-open for the next `*_URL` var somebody adds.
 * Anything not listed falls through to `describeSecret()`.
 */
const CONNECTION_STRING_ENV_VARS = new Set([
  "DATABASE_URL",
  "HISTORY_DATABASE_URL",
  "REDIS_URL",
  "TRIGGER_API_URL",
]);

/**
 * Domain-separation prefix for the fingerprints below. It is not a secret; it
 * only stops the published digests from being looked up in a generic
 * precomputed SHA-256 table. Reproduce a fingerprint against a local value
 * with the same recipe:
 *
 *   printf 'jitaspace:debug:v1%s' "$CRON_SECRET" | sha256sum | cut -c1-12
 *
 * Bump the version suffix if that recipe ever changes.
 */
export const FINGERPRINT_DOMAIN = "jitaspace:debug:v1";

/**
 * Hex characters of the SHA-256 digest kept. 12 chars = 48 bits, which is far
 * past the point where two different secrets collide by accident, and short
 * enough to compare by eye against the output of the command above. A longer
 * prefix buys nothing for comparison and only increases what leaks if this
 * page is ever reachable by someone who should not see it.
 *
 * The fingerprint is a confirm-a-guess oracle for a LOW-entropy secret, which
 * is acceptable only because `page.tsx` 404s the route when
 * `NODE_ENV === "production"`. That guard is load-bearing.
 */
export const FINGERPRINT_LENGTH = 12;

/**
 * `node:crypto` rather than Web Crypto: `crypto.subtle.digest()` is async and
 * is not present in every runtime this file is loaded in (notably jsdom, where
 * the debug page's jest test renders it), whereas `createHash()` is
 * synchronous and always available in the Next.js Node runtime this page runs
 * in. Keeping it synchronous means the redaction cannot be forgotten behind an
 * un-awaited promise.
 */
function fingerprint(value: string): string {
  return createHash("sha256")
    .update(FINGERPRINT_DOMAIN + value)
    .digest("hex")
    .slice(0, FINGERPRINT_LENGTH);
}

/**
 * Answers "is it set?", "is it the value I expect?" and "did it change?" for a
 * secret without disclosing it: presence, length (catches a truncated paste)
 * and a fingerprint to compare against a known value.
 */
function describeSecret(value: string): string {
  return `set · ${value.length} chars · sha256:${fingerprint(value)}`;
}

/**
 * Masks a connection string, keeping the parts that are actually debugged —
 * scheme, user, host, port and database/path — while dropping the password and
 * every query-parameter *value*. Parameter names are kept (`?schema=…`)
 * because "is `schema` set?" is a real question; their values are not, since
 * Prisma and Redis URLs can carry credentials there (`password=`, `sslcert=`).
 *
 * The username is deliberately kept in clear ("am I connecting as jita_app or
 * as postgres?"). If a provider that puts an API token in the username field is
 * ever adopted, mask it here too.
 *
 * Falls back to `describeSecret()` when the value does not parse as a URL, so
 * a malformed or non-URL value is never echoed verbatim.
 */
function describeConnectionString(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return describeSecret(value);
  }

  // A successful parse is not the same as the parse we meant. The authority
  // ends at the first "/", "?" or "#", so a password containing an unencoded
  // one of those — `postgresql://user/x:hunter2@host/db` — parses with an EMPTY
  // `url.password` and the credentials sitting in `url.pathname`, which the
  // renderer below would then echo verbatim.
  //
  // An "@" in a connection string means userinfo. If the parser did not read it
  // as userinfo, its idea of the value disagrees with ours, so fail closed to a
  // fingerprint rather than render a string we cannot account for.
  const parsedCredentials = url.username !== "" || url.password !== "";
  const atCount = (value.match(/@/g) ?? []).length;
  if (atCount > (parsedCredentials ? 1 : 0)) return describeSecret(value);

  const credentials =
    url.username || url.password
      ? `${url.username}${url.password ? ":***" : ""}@`
      : "";
  const path = url.pathname === "/" ? "" : url.pathname;
  const parameterNames = [...url.searchParams.keys()];
  const query = parameterNames.length
    ? `?${parameterNames.map((name) => `${name}=…`).join("&")}`
    : "";

  return `${url.protocol}//${credentials}${url.host}${path}${query} · sha256:${fingerprint(value)}`;
}

type EnvVarKind = "public" | "connection-string" | "secret";

function classifyEnvVar(key: string): EnvVarKind {
  // Checked first, so NEXT_PUBLIC_SITE_URL stays fully readable.
  if (key.startsWith("NEXT_PUBLIC_") || PUBLIC_ENV_VARS.has(key))
    return "public";
  if (CONNECTION_STRING_ENV_VARS.has(key)) return "connection-string";
  return "secret";
}

/**
 * Turns one env var into the display string sent to the browser. Classification
 * is by variable NAME and defaults to "secret", so an unrecognised key is
 * fingerprinted rather than shown.
 */
export function redactEnvValue(key: string, value: string | undefined): string {
  if (value === undefined) return "not set";
  // Only reachable with SKIP_ENV_VALIDATION=1; worth distinguishing from unset.
  if (value === "") return "set, but empty";

  switch (classifyEnvVar(key)) {
    case "public":
      return value;
    case "connection-string":
      return describeConnectionString(value);
    case "secret":
      return describeSecret(value);
  }
}
