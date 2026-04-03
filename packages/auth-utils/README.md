# @jitaspace/auth-utils

Shared authentication utilities and Zod schemas for JitaSpace.

## Overview

Provides helper functions and validation schemas used across the JitaSpace monorepo for working with EVE Online SSO tokens, NextAuth sessions, and related auth data.

## Exports

| Export | Description |
|---|---|
| Schemas | Zod schemas for auth-related data structures |
| Utils | Helper functions for token handling and session data |

## Installation

This is an internal workspace package. Import it in other packages using:

```ts
import { ... } from "@jitaspace/auth-utils";
```

## Building

```bash
pnpm build   # Compile to dist/
pnpm dev     # Watch mode
```

## Dependencies

- `next-auth` — Session and JWT types
- `next` — Next.js types
- `@jitaspace/esi-metadata` — ESI scope definitions
