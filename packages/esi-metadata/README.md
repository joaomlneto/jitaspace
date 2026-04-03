# @jitaspace/esi-metadata

Static metadata for the EVE Online ESI API.

## Overview

Provides TypeScript constants and types describing ESI entity ID ranges and OAuth2 scope definitions. Used throughout the monorepo to avoid hardcoding ESI-specific values.

## Exports

| Export | Description |
|---|---|
| ID ranges | Min/max numeric ID boundaries for EVE entity types (characters, corporations, alliances, etc.) |
| Scopes | Typed list of all EVE Online ESI OAuth2 scopes |

## Usage

```ts
import { ESI_SCOPES, CHARACTER_ID_RANGE } from "@jitaspace/esi-metadata";
```
