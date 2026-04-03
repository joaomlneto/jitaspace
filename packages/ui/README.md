# @jitaspace/ui

Shared React UI component library for JitaSpace, built on [Mantine](https://mantine.dev).

## Overview

Provides EVE Online-aware React components used across the JitaSpace web app. Components are built on top of Mantine 8 and integrate with `@jitaspace/esi-client`, `@jitaspace/hooks`, and `@jitaspace/eve-icons` to render EVE-specific data with minimal boilerplate.

## Usage

```tsx
import { CharacterAvatar, TypeBadge, SkillLevelBar } from "@jitaspace/ui";

<CharacterAvatar characterId={12345678} size={64} />
<TypeBadge typeId={587} />
<SkillLevelBar level={4} />
```

## Component Categories

| Category | Examples |
|---|---|
| Identity | `CharacterAvatar`, `CorporationAvatar`, `AllianceAvatar` |
| Items | `TypeBadge`, `TypeIcon`, `TypeName` |
| Layout | `Card`, `Breadcrumbs`, `Timeline` |
| Skills | `SkillLevelBar` |
| Text | `DateText`, `DurationText`, `ISKText` |
| Inputs | `Select`, `MultiSelect` |

## Dependencies

- `@mantine/core` + Mantine ecosystem — UI primitives and theming
- `@jitaspace/esi-client` — Live ESI data
- `@jitaspace/hooks` — High-level ESI hooks
- `@jitaspace/eve-icons` — Game icons
- `@tabler/icons-react` — General-purpose icons
