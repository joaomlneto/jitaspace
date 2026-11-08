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

/**
 * Longest value one cookie chunk may hold. Browsers silently drop a cookie
 * whose name plus value exceeds 4096 bytes (RFC 6265bis), and the sealed login
 * result outgrows that: it carries the whole access token, whose `scp` claim
 * lists every granted scope. At 36 scopes it no longer fit, the browser
 * dropped the Set-Cookie without a word, and every sign-in ended with no
 * character added. Iron seals are ASCII, so length equals bytes; the headroom
 * covers the chunk name.
 */
export const COOKIE_CHUNK_MAX_VALUE_LENGTH = 3800;

/** Name of the `index`-th chunk of a cookie split by {@link splitCookieValue}. */
export function getCookieChunkName(baseName: string, index: number): string {
  return `${baseName}.${index}`;
}

/** Split a value into chunks that each fit in one cookie. Always ≥ 1 chunk. */
export function splitCookieValue(
  value: string,
  maxLength: number = COOKIE_CHUNK_MAX_VALUE_LENGTH,
): string[] {
  if (maxLength <= 0) throw new RangeError("maxLength must be positive");
  const chunks: string[] = [];
  for (let start = 0; start < value.length; start += maxLength) {
    chunks.push(value.slice(start, start + maxLength));
  }
  return chunks.length > 0 ? chunks : [""];
}

/**
 * Reassemble a cookie split by {@link splitCookieValue}. `value` joins the
 * chunks from `.0` up to the first missing index, and is `undefined` when
 * there is no `.0`. `names` lists every chunk cookie present, contiguous or
 * not, so the caller can clear them all.
 */
export function joinCookieChunks(
  cookies: readonly { name: string; value: string }[],
  baseName: string,
): { value: string | undefined; names: string[] } {
  const prefix = `${baseName}.`;
  const byIndex = new Map<number, { name: string; value: string }>();
  for (const cookie of cookies) {
    if (!cookie.name.startsWith(prefix)) continue;
    const suffix = cookie.name.slice(prefix.length);
    if (!/^(0|[1-9]\d*)$/.test(suffix)) continue;
    byIndex.set(Number(suffix), cookie);
  }
  const names = [...byIndex.values()].map((cookie) => cookie.name);
  const parts: string[] = [];
  for (let chunk = byIndex.get(0); chunk; chunk = byIndex.get(parts.length)) {
    parts.push(chunk.value);
  }
  return { value: parts.length > 0 ? parts.join("") : undefined, names };
}
