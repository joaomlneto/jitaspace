# @jitaspace/esi-meta-client

Auto-generated TypeScript client for the EVE Online ESI Meta API.

## Overview

Provides typed axios functions and TanStack React Query hooks for the ESI meta endpoints (e.g. health status, route information). Generated from the ESI Meta OpenAPI spec using [Kubb](https://kubb.dev).

> **Do not edit files in `src/generated/` directly.** Run `pnpm kubb:generate` to regenerate.

## Usage

```ts
import { useGetStatus } from "@jitaspace/esi-meta-client";

function ServerStatus() {
  const { data } = useGetStatus();
  return <div>Players online: {data?.data.players}</div>;
}
```

## Scripts

| Command | Description |
|---|---|
| `pnpm kubb:generate` | Regenerate client from the OpenAPI spec |
