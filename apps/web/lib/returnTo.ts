/**
 * Open-redirect guard for the OAuth `returnTo` parameter. Kept in its own
 * client-safe module (no server-only imports) so the server route
 * (`serverAuth.ts`) and the client login/complete page share one implementation
 * and cannot drift.
 *
 * The value is resolved against a fixed, unreachable base and accepted only when
 * it stays same-origin. This closes bypasses that a naive
 * `startsWith("/") && !startsWith("//")` check misses — most notably backslash
 * paths like `/\evil.com`, which the WHATWG URL parser normalises to `//evil.com`
 * and thus resolves to `https://evil.com/`.
 */
export function sanitizeReturnTo(value: string | null | undefined): string {
  if (!value) return "/";
  try {
    const base = "https://x.invalid";
    const url = new URL(value, base);
    // Absolute, protocol-relative, and backslash paths resolve to a different
    // origin than the base — reject them.
    if (url.origin !== base) return "/";
    // Control characters (tab, newline, etc.) are stripped by browsers before
    // the URL is parsed, so they could smuggle a payload past the origin check.
    if ([...value].some((char) => char.charCodeAt(0) < 0x20)) return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}
