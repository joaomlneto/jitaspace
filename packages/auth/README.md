# @jitaspace/auth

NextAuth.js configuration for JitaSpace, providing EVE Online SSO authentication.

## Overview

This package exports a ready-to-use NextAuth `authOptions` object pre-configured with the EVE Online OAuth2 provider and session/JWT callbacks.

> **Note:** Automatic token refresh is currently disabled. The JWT callback throws on token expiry rather than refreshing — sessions will fail once the initial EVE SSO token expires.

## Usage

```ts
import NextAuth from "next-auth";

import { authOptions } from "@jitaspace/auth";

export default NextAuth(authOptions);
```

## Exports

| Export                        | Description                                      |
| ----------------------------- | ------------------------------------------------ |
| `authOptions`                 | NextAuth options object with EVE Online provider |
| `refreshTokenApiRouteHandler` | API route handler for refreshing EVE SSO tokens  |

## Configuration

This package reads **no** environment variables of its own. The host
application (e.g. `apps/web`) reads and validates its own environment and passes
the required credentials into each function as arguments:

| Field             | Description                                                             |
| ----------------- | ----------------------------------------------------------------------- |
| `eveClientId`     | EVE Online OAuth2 client ID                                             |
| `eveClientSecret` | EVE Online OAuth2 client secret                                         |
| `nextAuthSecret`  | Secret used to seal/unseal the OAuth flow & result cookies (≥ 32 chars) |

## Dependencies

- `next-auth` — Authentication framework
- `@jitaspace/auth-utils` — Token utilities and schemas
- `@jitaspace/esi-metadata` — EVE ESI scope definitions
