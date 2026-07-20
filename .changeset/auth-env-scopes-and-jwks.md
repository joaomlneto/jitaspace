---
"@jitaspace/auth-utils": minor
"@jitaspace/auth": minor
"@jitaspace/web": patch
---

refactor(auth): environment-agnostic auth + scope narrowing & JWKS verification

`@jitaspace/auth` no longer reads environment variables. `apps/web` reads and
validates its own env and passes `eveClientId` / `eveClientSecret` /
`nextAuthSecret` into the auth functions as arguments.

New EVE SSO token capabilities in `@jitaspace/auth-utils`:

- `refreshEveSsoToken` accepts an optional `scopes` to request a _subset_ of the
  originally-granted scopes on refresh (least privilege). The route handler
  `refreshTokenApiRouteHandler` forwards it via `config.scopes`.
- `verifyEveSsoAccessToken` verifies an access token's signature against EVE's
  JWKS plus the `iss` / `aud` / `exp` claims (pinned to RS256/ES256).
  `completeLoginFlow` and `refreshTokenApiRouteHandler` now verify EVE-issued
  tokens before trusting their claims; the sync `getEveSsoAccessTokenPayload`
  decoder is kept for client-side reads.

Also scrubs stale `next-auth` references from the package docs (it had already
been replaced by the custom SSO flow).
