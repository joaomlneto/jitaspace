# @jitaspace/auth-utils

[![npm version](https://img.shields.io/npm/v/@jitaspace/auth-utils)](https://www.npmjs.com/package/@jitaspace/auth-utils)
[![npm downloads](https://img.shields.io/npm/dm/@jitaspace/auth-utils)](https://www.npmjs.com/package/@jitaspace/auth-utils)
[![license](https://img.shields.io/npm/l/@jitaspace/auth-utils)](./LICENSE)

Framework-agnostic [EVE Online](https://www.eveonline.com) SSO token utilities — exchange authorization codes, refresh and cryptographically verify access tokens, and decode ESI JWT payloads.

## Installation

```bash
npm install @jitaspace/auth-utils
# or
pnpm add @jitaspace/auth-utils
```

Requires only web-standard globals — `fetch`, `atob`/`btoa` and `TextEncoder`/`TextDecoder` — so it runs unmodified on Node.js 18+, in browsers, on Deno, and on edge runtimes such as Cloudflare Workers. No Node `Buffer`, and no framework dependency.

`verifyEveSsoAccessToken` is the one server-only export: it reaches for `jose`, which needs Web Crypto and a network call to EVE's JWKS. Everything else, including `getEveSsoAccessTokenPayload`, is safe to run client-side.

## Overview

Small helpers around the [EVE Online SSO OAuth2 flow](https://docs.esi.evetech.net/docs/sso/).

| Export                        | Description                                                                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exchangeEveSsoToken`         | Exchange an authorization code (with PKCE `code_verifier`) for access/refresh tokens                                                                     |
| `refreshEveSsoToken`          | Refresh an access token, optionally narrowing to a subset of the granted `scopes`                                                                        |
| `getEveSsoAccessTokenPayload` | Decode an EVE SSO access token's JWT payload (typed, including `scp: ESIScope[]`) — no signature check                                                   |
| `verifyEveSsoAccessToken`     | Cryptographically verify an access token against EVE's JWKS (signature + `iss`/`aud`/`exp`, and `azp` when given a `clientId`); server-only, uses `jose` |
| `EveSsoTokenError`            | Thrown by the two calls above when EVE rejects the request; carries `status` and the RFC 6749 `error` payload                                            |

Types: `EveSsoAccessTokenPayload`, `SsoTokenSuccessResult`, `SsoRefreshTokenSuccessResult`.
Constants: `TOKEN_ENDPOINT`, `REFRESH_TOKEN_ENDPOINT`, `EVE_SSO_JWKS_URI`, `EVE_SSO_ISSUERS`, `EVE_SSO_AUDIENCE`.

## Usage

```ts
import {
  exchangeEveSsoToken,
  getEveSsoAccessTokenPayload,
  refreshEveSsoToken,
} from "@jitaspace/auth-utils";

// Exchange an authorization code received on the SSO callback
const tokens = await exchangeEveSsoToken({
  eveClientId: process.env.EVE_CLIENT_ID!,
  eveClientSecret: process.env.EVE_CLIENT_SECRET!,
  code,
  codeVerifier,
});

// Inspect the granted scopes
const payload = getEveSsoAccessTokenPayload(tokens.access_token);
const canReadMail = payload?.scp.includes("esi-mail.read_mail.v1") ?? false;

// Later, refresh the access token
const refreshed = await refreshEveSsoToken({
  eveClientId: process.env.EVE_CLIENT_ID!,
  eveClientSecret: process.env.EVE_CLIENT_SECRET!,
  refreshToken: tokens.refresh_token,
});
```

### Handling refresh failures

A refresh can fail two very different ways, and retrying only helps for one of
them. `EveSsoTokenError` carries EVE's [RFC 6749 §5.2](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2)
payload so you can tell them apart:

```ts
import { EveSsoTokenError, refreshEveSsoToken } from "@jitaspace/auth-utils";

try {
  await refreshEveSsoToken({ eveClientId, eveClientSecret, refreshToken });
} catch (error) {
  if (error instanceof EveSsoTokenError && error.requiresReauthentication) {
    // `invalid_grant`: the user revoked the application or changed their
    // password. EVE will never renew this token — drop the session and
    // prompt a fresh login. Retrying loops forever.
    return promptReauthentication();
  }
  throw error; // transient (5xx, network) — safe to retry
}
```

### Verifying a token you did not mint

Pass `clientId` whenever the token arrived from somewhere else — most
importantly an inbound `Authorization: Bearer` header. Every EVE SSO token
carries the same `"EVE Online"` audience, so without it a token issued to a
_different_ EVE application verifies successfully:

```ts
const payload = await verifyEveSsoAccessToken(token, {
  clientId: process.env.EVE_CLIENT_ID!,
});
```

## Dependencies

- [`jose`](https://github.com/panva/jose) — JWKS-based signature verification (dynamically imported; server-only)
- [`@jitaspace/esi-metadata`](https://www.npmjs.com/package/@jitaspace/esi-metadata) — the `ESIScope` union type used in the decoded token payload
