---
"@jitaspace/auth-utils": minor
"@jitaspace/auth": patch
---

fix(auth-utils): bind `verifyEveSsoAccessToken` to a specific EVE application

`verifyEveSsoAccessToken` checked only the constant `aud` value `"EVE Online"`,
which every EVE SSO token carries for every third-party application. A
validly-signed token minted for a _different_ EVE application therefore passed
verification — token substitution.

`verifyEveSsoAccessToken` now accepts a `clientId` option; when supplied, the
token's `azp` (authorized party) must equal it, so a successful verification
proves the token was issued to _your_ application. It is checked in addition to
the existing `iss`/`aud`/`exp` claims and throws jose's `JWTClaimValidationFailed`
on mismatch. `@jitaspace/auth` passes it at both call sites (`completeLoginFlow`
and `refreshTokenApiRouteHandler`).

The option is opt-in, so existing behaviour is unchanged when it is omitted —
but omitting it is only safe for a token you just obtained yourself from
`exchangeEveSsoToken` / `refreshEveSsoToken`. Anything verifying a token supplied
by a client should pass `clientId`.

Also fixes `EveSsoAccessTokenPayload.aud`, which was typed `string` even though
EVE may issue an array.
