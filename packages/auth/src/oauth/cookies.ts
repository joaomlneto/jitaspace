const FLOW_COOKIE_BASE = "eve.oauth.flow";
const RESULT_COOKIE_BASE = "eve.oauth.result";

/**
 * In production (HTTPS) we use the `__Host-` prefix, which the browser only
 * honours when the cookie is `Secure`, `Path=/` and has no `Domain` — locking
 * it to the exact host and making it immune to subdomain/insecure overwrites.
 * On http://localhost we can't use the prefix, so fall back to the bare name.
 */
function withPrefix(base: string, secure: boolean): string {
  return secure ? `__Host-${base}` : base;
}

/** Cookie holding the sealed `{ state, codeVerifier, returnTo }` flow data. */
export function getOAuthFlowCookieName(secure: boolean): string {
  return withPrefix(FLOW_COOKIE_BASE, secure);
}

/** Cookie holding the sealed, single-use login result handed to the client. */
export function getOAuthResultCookieName(secure: boolean): string {
  return withPrefix(RESULT_COOKIE_BASE, secure);
}
