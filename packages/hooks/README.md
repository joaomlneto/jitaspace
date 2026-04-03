# @jitaspace/hooks

High-level React Query hooks for interacting with the EVE Online ESI API and related services.

## Overview

Builds on top of `@jitaspace/esi-client` to provide ergonomic, auth-aware React hooks for common EVE data access patterns. Handles token refresh, pagination, and cross-client data aggregation.

## Usage

```tsx
import { useCharacterName, useCharacterPortrait } from "@jitaspace/hooks";

function CharacterCard({ characterId }: { characterId: number }) {
  const { data: name } = useCharacterName(characterId);
  const { data: portrait } = useCharacterPortrait(characterId);
  return <img src={portrait?.px128x128} alt={name} />;
}
```

## Peer Dependencies

- `react` ≥ 19
- `react-dom` ≥ 19

## Building

```bash
pnpm build   # Compile to dist/
pnpm dev     # Watch mode
```

## Dependencies

- `@jitaspace/esi-client` — ESI API access
- `@jitaspace/auth-utils` — Token and session utilities
- `@jitaspace/esi-metadata` — ESI scope and ID range constants
- `@tanstack/react-query` — Query and mutation management
- `zustand` — Internal state management
