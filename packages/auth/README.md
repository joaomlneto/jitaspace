# @jitaspace/auth

NextAuth.js configuration for JitaSpace, providing EVE Online SSO authentication.

## Overview

This package exports a ready-to-use NextAuth `authOptions` object pre-configured with the EVE Online OAuth2 provider and session/JWT callbacks.

> **Note:** Automatic token refresh is currently disabled. The JWT callback throws on token expiry rather than refreshing — sessions will fail once the initial EVE SSO token expires.

## Usage

```ts
import { authOptions } from "@jitaspace/auth";
import NextAuth from "next-auth";

export default NextAuth(authOptions);
```

## Exports

| Export | Description |
|---|---|
| `authOptions` | NextAuth options object with EVE Online provider |
| `refreshTokenApiRouteHandler` | API route handler for refreshing EVE SSO tokens |

## Environment Variables

| Variable | Description |
|---|---|
| `EVE_CLIENT_ID` | EVE Online OAuth2 client ID |
| `EVE_CLIENT_SECRET` | EVE Online OAuth2 client secret |
| `NEXTAUTH_SECRET` | Secret used to sign/encrypt NextAuth JWTs and cookies |
| `NEXTAUTH_URL` | Canonical URL of your Next.js app |

## Dependencies

- `next-auth` — Authentication framework
- `@jitaspace/auth-utils` — Token utilities and schemas
- `@jitaspace/esi-metadata` — EVE ESI scope definitions
