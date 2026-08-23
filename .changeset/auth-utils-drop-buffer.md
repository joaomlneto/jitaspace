---
"@jitaspace/auth-utils": minor
---

feat(auth-utils): remove the Node `Buffer` requirement

`Buffer` was used as a bare global in three places — building the Basic auth
header for both token calls, and base64-decoding the JWT payload. That made the
package Node-only, which is worst for `getEveSsoAccessTokenPayload`: it is
imported by client-side code and works in Next.js only because Next polyfills
`Buffer` into client bundles. A Vite app, a Cloudflare Worker without
`nodejs_compat`, or Deno without `--unstable-node-globals` would throw
`ReferenceError: Buffer is not defined` from a function that is otherwise pure
string arithmetic.

All three now use web-standard `atob`/`btoa` with `TextEncoder`/`TextDecoder`.
Two details that a naive swap gets wrong, and that this handles:

- **JWT segments are base64url.** They use the `-`/`_` alphabet and drop
  padding. `Buffer.from(x, "base64")` tolerated that silently; `atob` throws
  `InvalidCharacterError`. The alphabet is translated and padding restored
  before decoding.
- **`atob`/`btoa` are Latin-1.** `btoa` throws on any code point above U+00FF,
  and `atob` returns a binary string — so a client secret or character name
  containing non-ASCII would fail or come back as mojibake. The
  `TextEncoder`/`TextDecoder` steps make both paths UTF-8, matching `Buffer`'s
  behaviour exactly.

Verified byte-for-byte against `Buffer` across ASCII, Latin-1, CJK and emoji
inputs and every padding remainder, and by running the built bundle with the
`Buffer` global deleted.

`getEveSsoAccessTokenPayload` also now honours its `| null` return type for
every malformed token, not just a missing segment. Decoding can fail on invalid
base64 or invalid JSON, and since the token is untrusted input neither should
escape as a throw — previously a malformed payload threw from a function whose
signature promised otherwise.
