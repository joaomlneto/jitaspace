# @jitaspace/esi-client

Auto-generated TypeScript client for the [EVE Online ESI API](https://esi.evetech.net).

## Overview

Provides fully typed axios-based API functions and TanStack React Query hooks for every ESI endpoint. The client is generated from the ESI OpenAPI spec using [Kubb](https://kubb.dev) and includes Zod schemas for runtime validation.

> **Do not edit files in `src/generated/` directly.** Run `pnpm kubb:generate` to regenerate them from the latest OpenAPI spec.

## Usage

```ts
import { useGetCharactersCharacterId } from "@jitaspace/esi-client";

function CharacterInfo({ characterId }: { characterId: number }) {
  const { data } = useGetCharactersCharacterId(characterId);
  return <div>{data?.data.name}</div>;
}
```

## Scripts

| Command | Description |
|---|---|
| `pnpm kubb:generate` | Regenerate client from the latest ESI OpenAPI spec |
| `pnpm download-schema` | Download the latest `swagger.json` from ESI |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm dev` | Watch mode build |

## Building

The build depends on `kubb:generate` having been run first (populates `src/generated/`). In the monorepo this is handled automatically by Turborepo.

```bash
pnpm kubb:generate
pnpm build
```
