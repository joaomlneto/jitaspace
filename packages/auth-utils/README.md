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

Requires a runtime with global `fetch` and `Buffer` (Node.js 18+, or an equivalent modern runtime). No framework dependency — usable from any server, route handler, or worker.

## Overview

Small helpers around the [EVE Online SSO OAuth2 flow](https://docs.esi.evetech.net/docs/sso/).

| Export | Description |
|---|---|
| `exchangeEveSsoToken` | Exchange an authorization code (with PKCE `code_verifier`) for access/refresh tokens |
| `refreshEveSsoToken` | Refresh an access token using a refresh token |
| `getEveSsoAccessTokenPayload` | Decode an EVE SSO access token's JWT payload (typed, including `scp: ESIScope[]`) — no signature check |
| `verifyEveSsoAccessToken` | Cryptographically verify an access token against EVE's JWKS (signature + `iss`/`aud`/`exp`); server-only, uses `jose` |
| `tokenRefreshDataSchema` | Zod schema validating token-refresh response data |

## Usage

```ts
import {
  exchangeEveSsoToken,
  refreshEveSsoToken,
  getEveSsoAccessTokenPayload,
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

## Dependencies

- [`jose`](https://github.com/panva/jose) — JWKS-based signature verification (dynamically imported; server-only)
- [`zod`](https://zod.dev) — runtime validation of token-refresh response data
- [`@jitaspace/esi-metadata`](https://www.npmjs.com/package/@jitaspace/esi-metadata) — the `ESIScope` union type used in the decoded token payload
