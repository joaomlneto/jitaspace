# @jitaspace/sde-client

Auto-generated TypeScript client for the JitaSpace SDE (Static Data Export) API at [sde.jita.space](https://sde.jita.space).

## Overview

Provides typed axios functions and TanStack React Query hooks for accessing EVE Online static data (types, groups, categories, regions, etc.) served by the JitaSpace SDE API. Generated using [Kubb](https://kubb.dev).

> **Do not edit files in `src/generated/` directly.** Run `pnpm kubb:generate` to regenerate.

## Usage

```ts
import { useGetType } from "@jitaspace/sde-client";

function ItemName({ typeId }: { typeId: number }) {
  const { data } = useGetType(typeId);
  return <span>{data?.data.name}</span>;
}
```

## Scripts

| Command | Description |
|---|---|
| `pnpm kubb:generate` | Regenerate client from the OpenAPI spec |
