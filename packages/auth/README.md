# @jitaspace/auth

EVE Online SSO authentication for JitaSpace: a custom OAuth2 Authorization Code
flow with PKCE + `state`, plus helpers to seal/unseal the short-lived cookies
that carry it and to refresh access tokens.

> This package replaced an earlier `next-auth`-based setup and no longer depends
> on `next-auth`.

## Overview

The flow is split into small, framework-light functions that the host app wires
into its own routes/handlers:

1. **`createLoginFlow`** — generate `state` + PKCE and build the EVE authorize
   URL; returns sealed flow data to store in a short-lived, httpOnly cookie.
2. **`completeLoginFlow`** — validate the callback against the sealed flow (the
   `state` / CSRF check), exchange the code for tokens, and return the access
   token plus a sealed refresh-token blob.
3. **`sealLoginResult` / `readLoginResult`** — seal/unseal the single-use
   handoff cookie used to pass the freshly-minted tokens to the client.
4. **`refreshTokenApiRouteHandler`** — refresh an access token from a sealed
   refresh-token blob when it is at/near expiry.

Cookies are sealed with [`@hapi/iron`](https://hapi.dev/module/iron/) using the
`nextAuthSecret`.

## Usage

```ts
import { createLoginFlow } from "@jitaspace/auth";

import { env } from "~/env";

const { authorizationUrl, sealedFlow } = await createLoginFlow({
  scopes,
  redirectUri,
  returnTo,
  eveClientId: env.EVE_CLIENT_ID,
  nextAuthSecret: env.NEXTAUTH_SECRET,
});
```

See `apps/web/app/api/auth/*` for the full wiring.

## Key exports

| Export                                                | Description                                                |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| `createLoginFlow`                                     | Build the EVE authorize URL + sealed flow cookie data      |
| `completeLoginFlow`                                   | Verify the callback and exchange the code for tokens       |
| `sealLoginResult` / `readLoginResult`                 | Seal/unseal the single-use login-result cookie             |
| `refreshTokenApiRouteHandler`                         | Refresh an EVE SSO access token from a sealed refresh blob |
| `getOAuthFlowCookieName` / `getOAuthResultCookieName` | Cookie names (`__Host-`-prefixed when secure)              |
| `sealDataWithAuthSecret` / `unsealDataWithAuthSecret` | Low-level `@hapi/iron` seal/unseal helpers                 |
| `OAuthFlowError`, `LoginResult`                       | Error class + result type                                  |

## Configuration

This package reads **no** environment variables of its own. The host application
(e.g. `apps/web`) reads and validates its own environment and passes the
required credentials into each function as arguments:

| Field             | Description                                                             |
| ----------------- | ----------------------------------------------------------------------- |
| `eveClientId`     | EVE Online OAuth2 client ID                                             |
| `eveClientSecret` | EVE Online OAuth2 client secret                                         |
| `nextAuthSecret`  | Secret used to seal/unseal the OAuth flow & result cookies (≥ 32 chars) |

## Dependencies

- `@hapi/iron` — Seals/unseals the OAuth flow & result cookies
- `@jitaspace/auth-utils` — EVE SSO token exchange/refresh + schemas
- `@jitaspace/esi-metadata` — EVE ESI scope definitions
