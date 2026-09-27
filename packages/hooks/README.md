# @jitaspace/hooks

High-level React Query hooks for interacting with the EVE Online ESI API and related services.

## Overview

Builds on top of `@jitaspace/esi-client` to provide ergonomic, auth-aware React hooks for common EVE data access patterns. Handles token refresh, pagination, and cross-client data aggregation.

## Usage

```tsx
import { useCharacter, useCharacterSkills } from "@jitaspace/hooks";

function CharacterCard({ characterId }: { characterId: number }) {
  // Public data — no login needed.
  const { data: character, isLoading } = useCharacter(characterId);
  // Authenticated data — resolves only when a logged-in character holds the
  // `esi-skills.read_skills.v1` scope; `hasToken` says whether one does.
  const { data: skills, hasToken } = useCharacterSkills(characterId);

  if (isLoading) return <p>Loading…</p>;
  return (
    <p>
      {character?.name}
      {hasToken && ` — ${skills?.data.total_sp.toLocaleString()} SP`}
    </p>
  );
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
