---
"@jitaspace/auth-utils": minor
"@jitaspace/auth": patch
"@jitaspace/web": patch
---

feat(auth-utils): surface EVE's token errors, and drop the app-internal schema

**`EveSsoTokenError`.** `exchangeEveSsoToken` and `refreshEveSsoToken` threw a
fixed-string `Error`, discarding both the HTTP status and EVE's RFC 6749 §5.2
`{error, error_description}` body. That made a permanently revoked refresh token
indistinguishable from a passing 5xx, so the web app treated every failure as
transient and retried a doomed refresh every 30 seconds without ever flagging
the session for re-authentication.

Both calls now throw an `EveSsoTokenError` carrying `status`, `error`,
`errorDescription`, and a `requiresReauthentication` helper for the
`invalid_grant` case. `refreshTokenApiRouteHandler` maps that onto the `410` it
already returns for over-age tokens, which `apps/web` already translates into
`requires-reauth` — so a revoked token now marks the session expired instead of
looping. The body is read with `text()` and parsed inside a `try`, never a bare
`response.json()`: EVE 5xx responses and CDN edges return HTML, which would
otherwise turn a clean auth error into a `SyntaxError`. The unconditional
`console.error` in both helpers is gone; a library should report through the
error it throws.

**Exported result types.** `SsoTokenSuccessResult` and
`SsoRefreshTokenSuccessResult` were emitted into the `.d.ts` but left out of its
export list, so consumers could not name the return types.

**`tokenRefreshDataSchema` moved to `@jitaspace/auth`.** It describes this
application's sealed cookie (camelCase `{accessTokenExpiration, refreshToken}`),
not anything EVE sends — its only consumer is `refreshTokenApiRouteHandler`, in
a package that is private and unpublished. Removing it drops `zod` as a runtime
dependency of `@jitaspace/auth-utils` entirely, leaving `jose` and
`@jitaspace/esi-metadata`. `@jitaspace/auth` now declares the `zod` it was
already importing.
