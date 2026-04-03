# @jitaspace/eve-icons

EVE Online game icons as React components.

## Overview

Exports React components for EVE Online entity icons (items, ships, corporations, alliances, characters, etc.) backed by the EVE image server.

## Usage

```tsx
import { TypeIcon, CharacterIcon, CorporationIcon } from "@jitaspace/eve-icons";

// Render a ship/item icon by type ID
<TypeIcon typeId={587} size={64} />

// Render a character portrait
<CharacterIcon characterId={12345678} size={128} />

// Render a corporation logo
<CorporationIcon corporationId={98000001} size={64} />
```

## Exports

| Export | Description |
|---|---|
| Icon components | One component per EVE entity type (type, character, corporation, alliance, faction, …) |
| Icon context | React context for configuring default icon sizes and fallbacks |
