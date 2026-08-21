/**
 * Web-standard base64 helpers, so this package runs anywhere `fetch` does.
 *
 * These deliberately avoid Node's `Buffer`. `getEveSsoAccessTokenPayload` is
 * imported by client-side code, and a bare `Buffer` global makes the package
 * Node-only — it works in Next.js only because Next polyfills `Buffer` into
 * client bundles. A Vite app, a Cloudflare Worker without `nodejs_compat`, or
 * Deno without `--unstable-node-globals` would throw `ReferenceError: Buffer is
 * not defined` from what is otherwise pure string arithmetic.
 *
 * `atob`/`btoa`/`TextEncoder`/`TextDecoder` are available in every runtime this
 * package targets (Node 16+, browsers, Deno, Workers). Node documents
 * `atob`/`btoa` as legacy in favour of `Buffer`, which is precisely the
 * portability trade being made here.
 *
 * Internal — not part of the package's public API.
 */

/**
 * Encode a UTF-8 string as standard base64.
 *
 * `btoa` alone is not enough: it takes a *binary* string and throws on any code
 * point above U+00FF, so a client secret containing non-ASCII would fail. The
 * `TextEncoder` step converts to UTF-8 bytes first, matching
 * `Buffer.from(input, "utf-8").toString("base64")`.
 */
export function utf8ToBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/**
 * Decode a base64url (or plain base64) segment as UTF-8.
 *
 * Two things `atob` will not do on its own, both of which matter for real JWTs:
 *
 * 1. **base64url.** JWT segments use the `-`/`_` alphabet and drop padding.
 *    `Buffer.from(x, "base64")` silently tolerates that; `atob` throws
 *    `InvalidCharacterError`. So the alphabet is translated and padding
 *    restored first.
 * 2. **UTF-8.** `atob` returns a Latin-1 binary string, so a character name
 *    with non-ASCII characters would be mojibake. `TextDecoder` reinterprets
 *    the bytes as UTF-8, matching `Buffer`'s default.
 */
export function base64UrlToUtf8(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
