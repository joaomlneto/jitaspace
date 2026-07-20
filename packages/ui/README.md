# @jitaspace/ui

Shared React UI component library for JitaSpace, built on [Mantine](https://mantine.dev).

## Overview

Provides presentational React components used across the JitaSpace web app, built
on top of Mantine. These components are **dependency-light**: they render
already-resolved data passed in via props and do not fetch from ESI themselves,
so the package depends only on `@jitaspace/eve-icons` and `@jitaspace/utils`
(plus the Mantine/Tiptap UI ecosystem).

> Data-aware ("smart") EVE components that resolve entity ids by calling ESI
> hooks — e.g. `CharacterName`, `TypeAnchor`, `EveEntityAvatar`, `AllianceCard` —
> live in [`@jitaspace/eve-components`](../eve-components), which composes these
> presentational primitives with `@jitaspace/hooks`. For each smart component the
> pure rendering twin stays here (e.g. `EveEntityNameDisplay`,
> `EveEntityAnchorDisplay`).

## Usage

```tsx
import { CharacterAvatar, ISKAmount, SkillLevelBar } from "@jitaspace/ui";

<CharacterAvatar characterId={12345678} size={64} />
<SkillLevelBar level={4} />
<ISKAmount amount={1000000} />
```

## Component Categories

| Category      | Examples                                              |
| ------------- | ---------------------------------------------------- |
| Identity      | `CharacterAvatar`, `CorporationAvatar`, `AllianceAvatar` |
| Items         | `TypeAvatar`, `CategoryName`, `MarketGroupName`       |
| Display twins | `EveEntityNameDisplay`, `EveEntityAnchorDisplay`     |
| Skills        | `SkillLevelBar`                                       |
| Text          | `DateText`, `DurationText`, `ISKAmount`               |
| Inputs        | `Select`, `MultiSelect`                               |

## Dependencies

- `@mantine/core` + Mantine ecosystem — UI primitives and theming
- `@jitaspace/eve-icons` — Game icons
- `@jitaspace/utils` — Shared helpers
- `@tabler/icons-react` — General-purpose icons
